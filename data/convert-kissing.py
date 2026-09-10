"""Convert the pinned public NumPy certificate to browser JSON using stdlib only."""
import hashlib
import json
from pathlib import Path
import struct
import zipfile

directory = Path(__file__).resolve().parent
certificate = directory / "kissing_certificates.npz"
digest = hashlib.sha256(certificate.read_bytes()).hexdigest()
expected = "61b3a572ad194a3b97d8bcae8694d57ae676328a81ef0e4db95e57a2c9d44f37"
if digest != expected:
    raise ValueError("The upstream certificate hash does not match")
with zipfile.ZipFile(certificate) as archive:
    content = archive.read("config_coefficients.npy")
if content[:8] != b"\x93NUMPY\x01\x00":
    raise ValueError("Unexpected NumPy format")
header_length = struct.unpack("<H", content[8:10])[0]
raw = content[10 + header_length:]
if len(raw) != 3 * 604 * 11 * 2 * 2:
    raise ValueError("Unexpected coordinate data length")
values = struct.unpack("<" + str(len(raw) // 2) + "h", raw)
configurations = [
    [[list(values[((c * 604 + i) * 11 + k) * 2:((c * 604 + i) * 11 + k) * 2 + 2])
      for k in range(11)] for i in range(604)] for c in range(3)
]
data = {
    "source": "https://github.com/dualverse-ai/station_data_v2/tree/main/artifacts/kissing_number",
    "sourceSha256": digest, "denominator": 6, "coreSize": 496,
    "configurations": configurations,
}
(directory / "kissing.json").write_text(json.dumps(data, separators=(",", ":")))
