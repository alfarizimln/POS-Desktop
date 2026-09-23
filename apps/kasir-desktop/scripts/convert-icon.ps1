# Convert PNG -> build/icon.ico (multi-size, compatible Windows 7).
# Small entries (16/24/32/48) use BMP-BGRA, entry 256 uses PNG.
# Run from folder apps/kasir-desktop:
#   powershell -ExecutionPolicy Bypass -File scripts\convert-icon.ps1 <file-png>
# Example:
#   powershell -ExecutionPolicy Bypass -File scripts\convert-icon.ps1 food.png

param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$InputPng
)

Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$buildDir = Join-Path $root "build"
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null
$out = Join-Path $buildDir "icon.ico"

if (-not [System.IO.Path]::IsPathRooted($InputPng)) {
  $InputPng = Join-Path (Get-Location) $InputPng
}
if (-not (Test-Path -LiteralPath $InputPng)) {
  throw "PNG not found: $InputPng"
}

$src = [System.Drawing.Image]::FromFile($InputPng)
if ($src.Width -lt 16 -or $src.Height -lt 16) {
  $src.Dispose()
  throw "PNG terlalu kecil - minimal 16x16 piksel."
}
Write-Output ("Input: {0} ({1}x{2})" -f $InputPng, $src.Width, $src.Height)

# --- Master 256x256 (fit + center, transparent if aspect ratio is not 1:1) ---
$bmp = New-Object System.Drawing.Bitmap(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$scale = [Math]::Min(256 / $src.Width, 256 / $src.Height)
$dw = [Math]::Floor($src.Width * $scale)
$dh = [Math]::Floor($src.Height * $scale)
$dx = [Math]::Floor((256 - $dw) / 2)
$dy = [Math]::Floor((256 - $dh) / 2)
$g.DrawImage($src, $dx, $dy, $dw, $dh)
$src.Dispose()
$g.Dispose()

function New-Scaled($srcBitmap, $size) {
  $dst = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gg = [System.Drawing.Graphics]::FromImage($dst)
  $gg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gg.Clear([System.Drawing.Color]::Transparent)
  $gg.DrawImage($srcBitmap, 0, 0, $size, $size)
  $gg.Dispose()
  return $dst
}

function Get-BmpEntry($b) {
  $w = $b.Width; $h = $b.Height
  $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  $bd = $b.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    $bytes = New-Object byte[] ($bd.Stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($bd.Scan0, $bytes, 0, $bytes.Length)
  } finally {
    $b.UnlockBits($bd)
  }
  $row = $w * 4
  $px = New-Object byte[] ($row * $h)
  for ($y = 0; $y -lt $h; $y++) {
    [Buffer]::BlockCopy($bytes, ($h - 1 - $y) * $bd.Stride, $px, $y * $row, $row)
  }
  $ms = New-Object System.IO.MemoryStream
  $bw = New-Object System.IO.BinaryWriter($ms)
  $bw.Write([int]40); $bw.Write([int]$w); $bw.Write([int]($h * 2))
  $bw.Write([int16]1); $bw.Write([int16]32)
  $bw.Write([int]0); $bw.Write([int]0); $bw.Write([int]0)
  $bw.Write([int]0); $bw.Write([int]0); $bw.Write([int]0)
  $bw.Write($px)
  $maskRow = [int]([Math]::Ceiling($w / 32) * 4)
  $bw.Write((New-Object byte[] ($maskRow * $h)))
  $bw.Flush()
  return ,[byte[]]$ms.ToArray()
}

$images = @()
foreach ($s in @(16, 24, 32, 48)) {
  $sb = New-Scaled $bmp $s
  $images += @{ Size = $s; Data = (Get-BmpEntry $sb) }
  $sb.Dispose()
}
$png256 = New-Object System.IO.MemoryStream
$bmp.Save($png256, [System.Drawing.Imaging.ImageFormat]::Png)
$images += @{ Size = 256; Data = $png256.ToArray() }
$bmp.Dispose()

$fs = [System.IO.File]::Open($out, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([int16]0); $bw.Write([int16]1); $bw.Write([int16]$images.Count)
$offset = 6 + 16 * $images.Count
foreach ($im in $images) {
  $w = if ($im.Size -eq 256) { 0 } else { $im.Size }
  $bw.Write([byte]$w); $bw.Write([byte]$w); $bw.Write([byte]0); $bw.Write([byte]0)
  $bw.Write([int16]1); $bw.Write([int16]32)
  $bw.Write([int]$im.Data.Length); $bw.Write([int]$offset)
  $offset += $im.Data.Length
}
foreach ($im in $images) { $bw.Write($im.Data) }
$bw.Flush(); $bw.Close(); $fs.Close()

# --- Read-back verification (ICONDIR structure + per-entry magic) ---
$rf = [System.IO.File]::OpenRead($out)
$rb = New-Object System.IO.BinaryReader($rf)
$reserved = $rb.ReadUInt16(); $imgType = $rb.ReadUInt16(); $count = $rb.ReadUInt16()
$entries = @()
for ($i = 0; $i -lt $count; $i++) {
  $w = $rb.ReadByte(); $rb.ReadByte() | Out-Null; $rb.ReadBytes(2) | Out-Null
  $planes = $rb.ReadUInt16(); $bpp = $rb.ReadUInt16()
  $len = $rb.ReadUInt32(); $off = $rb.ReadUInt32()
  if ($w -eq 0) { $w = 256 }
  $entries += [pscustomobject]@{ W = $w; Planes = $planes; Bpp = $bpp; Len = $len; Off = $off }
}
$magics = @()
foreach ($e in $entries) {
  $rf.Seek($e.Off, [System.IO.SeekOrigin]::Begin) | Out-Null
  $b = $rb.ReadBytes(4)
  $magics += ('{0:X2}{1:X2}{2:X2}{3:X2}' -f $b[0], $b[1], $b[2], $b[3])
}
$rf.Close()
$item = Get-Item $out
Write-Output ("OK {0} count={1} reserved={2} type={3} sizeKB={4}" -f $out, $count, $reserved, $imgType, [math]::Round($item.Length / 1KB, 1))
foreach ($e in $entries) {
  Write-Output ("  entry size={0} planes={1} bpp={2} len={3} off={4}" -f $e.W, $e.Planes, $e.Bpp, $e.Len, $e.Off)
}
Write-Output ("  magics: " + ($magics -join " "))

# --- Verify Windows Icon loader can load it ---
$icon = New-Object System.Drawing.Icon($out)
Write-Output ("  Icon loader OK: {0}x{1}" -f $icon.Width, $icon.Height)
$icon.Dispose()