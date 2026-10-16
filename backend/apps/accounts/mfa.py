import pyotp
import qrcode
from io import BytesIO
import base64


class MFAService:
    """Service for TOTP-based multi-factor authentication."""
    
    @staticmethod
    def generate_secret() -> str:
        """Generate a new TOTP secret."""
        return pyotp.random_base32()
    
    @staticmethod
    def generate_qr_code(secret: str, email: str, issuer: str = "CoastShield") -> str:
        """Generate a QR code for TOTP setup."""
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=email,
            issuer_name=issuer,
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64 for transmission
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    @staticmethod
    def verify_totp(secret: str, code: str) -> bool:
        """Verify a TOTP code."""
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)  # Allow 1 step (30 seconds) window
    
    @staticmethod
    def generate_backup_codes(count: int = 10) -> list[str]:
        """Generate backup codes for MFA recovery."""
        import secrets
        return [secrets.token_urlsafe(8).upper() for _ in range(count)]
    
    @staticmethod
    def hash_backup_code(code: str) -> str:
        """Hash a backup code for storage."""
        import hashlib
        return hashlib.sha256(code.encode()).hexdigest()
    
    @staticmethod
    def verify_backup_code(hashed_codes: list[str], code: str) -> bool:
        """Verify a backup code against hashed codes."""
        import hashlib
        hashed_input = hashlib.sha256(code.upper().encode()).hexdigest()
        return hashed_input in hashed_codes
