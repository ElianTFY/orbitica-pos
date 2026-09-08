import asyncio
from contextlib import asynccontextmanager
import pytest
from app.workers import hacienda_outbox_worker as worker_module


@pytest.mark.asyncio
async def test_worker_shutdown_finishes_inflight_batch_before_closing_session(monkeypatch):
    entered = asyncio.Event()
    finish_batch = asyncio.Event()
    events = []

    @asynccontextmanager
    async def session():
        events.append("session_open")
        yield object()
        events.append("session_close")

    worker = worker_module.HaciendaOutboxWorker()

    async def process_batch(_db):
        entered.set()
        await finish_batch.wait()
        events.append("batch_finished")
        return 1

    monkeypatch.setattr(worker_module, "AsyncSessionLocal", session)
    monkeypatch.setattr(worker, "process_batch", process_batch)
    task = asyncio.create_task(worker.run_loop())
    await asyncio.wait_for(entered.wait(), timeout=1)
    worker.stop()
    assert not task.done()
    finish_batch.set()
    await asyncio.wait_for(task, timeout=1)
    assert events == ["session_open", "batch_finished", "session_close"]


@pytest.mark.asyncio
async def test_worker_shutdown_wakes_an_idle_poll_immediately(monkeypatch):
    entered = asyncio.Event()

    @asynccontextmanager
    async def session():
        yield object()

    async def process_batch(_db):
        entered.set()
        return 0

    worker = worker_module.HaciendaOutboxWorker()
    monkeypatch.setattr(worker_module, "AsyncSessionLocal", session)
    monkeypatch.setattr(worker, "process_batch", process_batch)
    task = asyncio.create_task(worker.run_loop(poll_interval_seconds=60))
    await asyncio.wait_for(entered.wait(), timeout=1)
    await asyncio.sleep(0)
    worker.stop()
    await asyncio.wait_for(task, timeout=1)
