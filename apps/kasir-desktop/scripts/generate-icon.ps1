# Generate build/icon.ico — logo POS Rumah Makan (multi-size, kompatibel Windows 7).
# Entry kecil (16/24/32/48) memakai BMP-BGRA, entry 256 memakai PNG.
# Jalankan dari folder apps/kasir-desktop:
#   powershell -ExecutionPolicy Bypass -File scripts\generate-icon.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$buildDir = Join-Path $root "build"
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null
$out = Join-Path $buildDir "icon.ico"

function New-RoundedRectPath($x, $y, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc(($x + $w - $d), $y, $d, $d, 270, 90)
  $p.AddArc(($x + $w - $d), ($y + $h - $d), $d, $d, 0, 90)
  $p.AddArc($x, ($y + $h - $d), $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# --- Master 256x256 ---
$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

# Background: kotak biru membulat
$bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(37, 99, 235))
$path = New-RoundedRectPath 8 8 240 240 52
$g.FillPath($bg, $path)
$bg.Dispose(); $path.Dispose()

# Mangkuk (putih)
$bowlBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.FillEllipse($bowlBrush, 52, 128, 152, 66)
$rimBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(219, 234, 254))
$g.FillEllipse($rimBrush, 68, 140, 120, 40)
$foodBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(34, 197, 94))
$g.FillEllipse($foodBrush, 92, 138, 30, 26)
$g.FillEllipse($foodBrush, 126, 134, 30, 28)
$g.FillEllipse($foodBrush, 150, 142, 26, 24)
$bowlBrush.Dispose(); $rimBrush.Dispose(); $foodBrush.Dispose()

# Uap (dua lengkung putih)
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 11)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawCurve($pen, [System.Drawing.PointF[]]@(
  (New-Object System.Drawing.PointF(102, 110)),
  (New-Object System.Drawing.PointF(94, 88)),
  (New-Object System.Drawing.PointF(104, 66)),
  (New-Object System.Drawing.PointF(96, 44))
))
$g.DrawCurve($pen, [System.Drawing.PointF[]]@(
  (New-Object System.Drawing.PointF(152, 112)),
  (New-Object System.Drawing.PointF(160, 90)),
  (New-Object System.Drawing.PointF(150, 68)),
  (New-Object System.Drawing.PointF(158, 46))
))
$pen.Dispose()
$g.Dispose()

function New-Scaled($src, $size) {
  $dst = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gg = [System.Drawing.Graphics]::FromImage($dst)
  $gg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gg.Clear([System.Drawing.Color]::Transparent)
  $gg.DrawImage($src, 0, 0, $size, $size)
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

# --- Verifikasi baca-balik (struktur ICONDIR + magic tiap entry) ---
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
