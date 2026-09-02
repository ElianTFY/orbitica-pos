import logging
from typing import Optional, Dict, Any, List
from decimal import Decimal
from app.adapters.email_adapter import get_email_adapter, BaseEmailAdapter

logger = logging.getLogger("fiscal_email_service")

class FiscalEmailService:
    def __init__(self, adapter: Optional[BaseEmailAdapter] = None):
        self.adapter = adapter or get_email_adapter()

    def render_invoice_html(
        self,
        issuer_name: str,
        customer_name: str,
        consecutive_number: str,
        numeric_key: str,
        total_amount: Decimal,
        currency: str = "CRC",
        doc_type_name: str = "Factura Electrónica"
    ) -> str:
        formatted_total = f"{total_amount:,.2f}"
        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{doc_type_name} - {consecutive_number}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }}
        .header {{ background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center; }}
        .content {{ padding: 24px; color: #334155; line-height: 1.6; }}
        .data-box {{ background-color: #f1f5f9; border-radius: 6px; padding: 16px; margin: 20px 0; }}
        .data-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; }}
        .label {{ font-weight: 600; color: #64748b; }}
        .value {{ font-weight: 700; color: #0f172a; }}
        .clave-box {{ font-family: monospace; font-size: 11px; background: #e2e8f0; padding: 8px; border-radius: 4px; word-break: break-all; margin-top: 10px; }}
        .footer {{ background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
        .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; margin-top: 15px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin:0;">{issuer_name}</h2>
            <p style="margin:4px 0 0 0; font-size:14px; opacity:0.8;">Comprobante Electrónico Autorizado por DGT</p>
        </div>
        <div class="content">
            <p>Estimado(a) <strong>{customer_name}</strong>,</p>
            <p>Le hacemos entrega de su <strong>{doc_type_name}</strong> emitida bajo las disposiciones técnicas oficiales de la Dirección General de Tributación de Costa Rica.</p>
            
            <div class="data-box">
                <div class="data-row">
                    <span class="label">Consecutivo:</span>
                    <span class="value">{consecutive_number}</span>
                </div>
                <div class="data-row">
                    <span class="label">Total Facturado:</span>
                    <span class="value">{currency} {formatted_total}</span>
                </div>
                <div style="margin-top:12px;">
                    <span class="label">Clave Numérica Oficial (50 dígitos):</span>
                    <div class="clave-box">{numeric_key}</div>
                </div>
            </div>

            <p style="font-size:13px; color:#64748b;">
                Adjunto a este correo encontrará el archivo XML firmado digitalmente (XAdES-EPES) que constituye el comprobante fiscal legal, así como el acuse de recibo de Hacienda.
            </p>
        </div>
        <div class="footer">
            Generado automáticamente por Orbítica POS &bull; Facturación Electrónica Costa Rica v4.4
        </div>
    </div>
</body>
</html>"""

    async def send_invoice_email(
        self,
        to_email: str,
        issuer_name: str,
        customer_name: str,
        consecutive_number: str,
        numeric_key: str,
        total_amount: Decimal,
        currency: str,
        signed_xml: str,
        hacienda_response_xml: Optional[str] = None,
        doc_type_name: str = "Factura Electrónica"
    ) -> bool:
        """
        Sends fiscal email with signed XML and Hacienda acceptance XML attached.
        Falls back gracefully if SMTP is unavailable.
        """
        subject = f"{doc_type_name} {consecutive_number} - {issuer_name}"
        html_content = self.render_invoice_html(
            issuer_name=issuer_name,
            customer_name=customer_name,
            consecutive_number=consecutive_number,
            numeric_key=numeric_key,
            total_amount=total_amount,
            currency=currency,
            doc_type_name=doc_type_name
        )
        text_content = (
            f"{doc_type_name} {consecutive_number}\n"
            f"Emisor: {issuer_name}\n"
            f"Cliente: {customer_name}\n"
            f"Total: {currency} {total_amount:,.2f}\n"
            f"Clave: {numeric_key}\n"
            "Adjunto encontrará su comprobante en XML firmado oficial."
        )

        attachments = [
            {
                "filename": f"{numeric_key}.xml",
                "content": signed_xml.encode("utf-8"),
                "mime_type": "application/xml"
            }
        ]

        if hacienda_response_xml:
            attachments.append({
                "filename": f"{numeric_key}_respuesta.xml",
                "content": hacienda_response_xml.encode("utf-8"),
                "mime_type": "application/xml"
            })

        try:
            return await self.adapter.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                attachments=attachments
            )
        except Exception as e:
            logger.error(f"Fallo no crítico al enviar correo fiscal a {to_email}: {e}")
            return False
