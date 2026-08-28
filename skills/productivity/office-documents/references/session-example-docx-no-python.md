# Session Example: Creating a .docx Without Python on Windows

**Date:** 2026-07-24
**Host:** Windows 10, git-bash (MSYS)
**Task:** Create a .docx file with "中华人民共和国情况简介" content

## Context

- `python` was blocked by Windows Store shim (Microsoft/WindowsApps)
- `zip` was not available in git-bash
- `PowerShell` was available at `/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`

## Build Directory Structure

```
C:\Users\Allen\AppData\Local\Temp\docxbuild\
├── [Content_Types].xml
├── _rels/
│   └── .rels
└── word/
    └── document.xml
```

## Word Document XML (document.xml)

Used `w:document` with `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"`. Content included:

1. Title: centered, bold, 18pt (`<w:sz w:val="36"/>`)
2. Six sections with bold headings and normal body paragraphs
3. Right-aligned italic disclaimer at the bottom

Paragraph formatting applied:
- `<w:jc w:val="center"/>` — center alignment
- `<w:jc w:val="right"/>` — right alignment
- `<w:rPr><w:b/><w:sz w:val="28"/></w:rPr>` — bold 14pt heading

## PowerShell Packaging Script

**DON'T use `CreateFromDirectory`** — it stores entries with backslash separators which violates OOXML spec.

**Correct approach** — manual entry creation with forward slashes:

```powershell
Add-Type -AssemblyName System.IO.Compression
$fs = New-Object System.IO.FileStream($outPath, [System.IO.FileMode]::Create)
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
$files = @(
  @("[Content_Types].xml", "$srcDir\[Content_Types].xml"),
  @("_rels/.rels",         "$srcDir\_rels\.rels"),
  @("word/document.xml",   "$srcDir\word\document.xml")
)
foreach ($item in $files) {
  $entry = $zip.CreateEntry($item[0], [System.IO.Compression.CompressionLevel]::Optimal)
  $es = $entry.Open()
  $bytes = [System.IO.File]::ReadAllBytes($item[1])
  $es.Write($bytes, 0, $bytes.Length)
  $es.Dispose()
}
$zip.Dispose()
$fs.Dispose()
```

## Chinese Path Handling

PowerShell's `System.IO.File` and `System.IO.Compression.ZipFile` throw `ArgumentException` when paths contain Chinese characters. **Workaround: build to ASCII-only temp path, then `mv` to destination.**

```bash
# PowerShell script writes to:
$out = "C:\Users\Allen\AppData\Local\Temp\out_cn.docx"

# Bash moves to Chinese destination:
mv "/c/Users/.../Temp/out_cn.docx" "/c/Users/.../Desktop/智能体测试结果/中华人民共和国简介.docx"
```

## Verification

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead("C:\Users\...\Temp\verify.docx")
$z.Entries | ForEach-Object { Write-Output $_.FullName }
$z.Dispose()
```

Expected entries use **forward slashes** (not backslashes):
```
[Content_Types].xml
_rels/.rels
word/document.xml
```

## Result

Created 2.3 KB .docx with 6 sections of formatted content, verified entry structure.