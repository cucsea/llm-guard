---
name: office-documents
description: Create and edit Office documents (.docx, .xlsx, .pptx) from the terminal — with or without Python. Techniques for writing OOXML packages programmatically on Windows hosts.
version: 1.0.0
platforms: [windows]
---

# Office Documents (OOXML)

Create .docx (and similar OOXML) files on a Windows host. Two approaches:

1. **python-docx via execute_code** (preferred — richer formatting, simpler code)
2. **Manual OOXML + PowerShell** (fallback when Python is unavailable)

## Approach A: python-docx via execute_code (PREFERRED)

The `execute_code` tool uses the Hermes embedded Python at `D:\llm-safe\hermes-agent\python_embedded\python.exe`, which has `python-docx` available. This approach supports rich formatting (headings, colors, tables, fonts) with clean Python code.

```python
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

# Set default font
style = doc.styles['Normal']
style.font.name = '微软雅黑'
style.font.size = Pt(11)

# Title
title = doc.add_heading('文档标题', level=0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
for run in title.runs:
    run.font.size = Pt(22)
    run.font.color.rgb = RGBColor(0x1A, 0x1A, 0x2E)

# Section heading
doc.add_heading('一、章节标题', level=1)

# Paragraph with colored metadata
p = doc.add_paragraph()
run = p.add_run('来源：百度热搜')
run.font.size = Pt(10)
run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)

# Normal paragraph
doc.add_paragraph('正文内容...')

# Save
doc.save(r'C:\path\to\output.docx')
```

### python-docx formatting reference

| Feature | Code |
|---------|------|
| Title (level 0) | `doc.add_heading('Title', level=0)` |
| Section heading | `doc.add_heading('一、...', level=1)` |
| Sub-heading | `doc.add_heading('...', level=2)` |
| Font color | `run.font.color.rgb = RGBColor(r, g, b)` |
| Font size | `run.font.size = Pt(12)` |
| Bold | `run.bold = True` |
| Italic | `run.italic = True` |
| Center align | `paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER` |
| Divider line | `doc.add_paragraph('─' * 50)` |

### Chinese path note

`doc.save()` handles Chinese characters in file paths correctly on this host — no workaround needed.

## Approach B: Manual OOXML + PowerShell (fallback)

## Prerequisites

- **PowerShell** (available on all Windows systems at `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`)
- **No Python or zip required** — the technique uses `System.IO.Compression` from .NET

## Core Technique: Manual OOXML Package Construction

A .docx file is a ZIP archive containing at minimum:

```
[Content_Types].xml
_rels/.rels
word/document.xml
```

### Step 1: Write the XML component files

Create three XML files:

**`[Content_Types].xml`** — declares the MIME types:
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
```

**`_rels/.rels`** — declares the relationship to the document part:
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
```

**`word/document.xml`** — the actual document body (see below for structure).

### Step 2: Build the document body XML

```xml
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <!-- Paragraph with centered bold title -->
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>Title Here</w:t></w:r>
    </w:p>
    <!-- Normal paragraph -->
    <w:p>
      <w:r><w:t>Body text here.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>
```

Common formatting elements:

| Style | w:pPr / w:rPr |
|-------|---------------|
| Bold | `<w:b/>` |
| Italic | `<w:i/>` |
| Font size (half-pts) | `<w:sz w:val="24"/>` (12pt) |
| Center align | `<w:jc w:val="center"/>` |
| Right align | `<w:jc w:val="right"/>` |
| Line break | `<w:br/>` inside `<w:r>` |

### Bordered + shaded table

Tables render reliably even in a minimal 3-part package as long as borders are declared inline via `<w:tblBorders>`. Do NOT rely on `<w:tblStyle w:val="TableGrid"/>` alone — that referenced style doesn't exist without a styles.xml part, so borders silently vanish. Shade header cells with `<w:shd>`.

```xml
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="808080"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="808080"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="808080"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="808080"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="808080"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="808080"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tr>
    <w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/></w:tcPr>
      <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Header</w:t></w:r></w:p></w:tc>
    <w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>
      <w:p><w:r><w:t>Value</w:t></w:r></w:p></w:tc>
  </w:tr>
</w:tbl>
```

### Chinese-document formatting (proven this session)

- **Chinese fonts:** `<w:rFonts w:eastAsia="仿宋"/>` (or `宋体`) inside `w:rPr`. 仿宋 for body, 宋体 for headings gives a standard official-document (公文) look.
- **Horizontal rule / red header line:** a paragraph with `<w:pPr><w:pBdr><w:bottom w:val="single" w:sz="18" w:space="1" w:color="C00000"/></w:pBdr></w:pPr>`.
- **First-line indent (首行缩进):** `<w:ind w:firstLine="560"/>` (~2 chars at 28 half-pt; use `firstLine="592"` for larger body text).
- **1.5 line spacing:** `<w:spacing w:line="360" w:lineRule="auto"/>`.
- **Colored title text:** `<w:color w:val="C00000"/>` (a common 公文 red) in the run's `w:rPr`.

### Step 3: Package into ZIP with PowerShell

**Option A: `CreateFromDirectory` (simple but DANGER: uses backslash entry paths)**

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($srcDir, $outPath)
```
⚠️ **CRITICAL PITFALL**: `CreateFromDirectory` stores entries with backslash path separators (`word\document.xml` instead of `word/document.xml`). OOXML parsers require forward slashes. Many Word versions still accept backslashes, but some do not — use Option B for correctness.

**Option B: Manual entry creation (FORWARD SLASHES, preferred)**

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

### Step 4: Verify the package structure

Check that entries use forward slashes:
```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($outPath)
$z.Entries | ForEach-Object { Write-Output $_.FullName }
$z.Dispose()
```

Expected output:
```
[Content_Types].xml
_rels/.rels
word/document.xml
```

## Chinese Path Workaround

PowerShell's `System.IO.Compression` has encoding issues with Chinese characters in file paths. Workaround:

1. Build the .docx to an ASCII-only temp path (e.g. `C:\Users\...\AppData\Local\Temp\out.docx`)
2. Move the file to the Chinese-named destination with `mv` from bash/terminal

```bash
mv "/c/Users/.../Temp/out.docx" "/c/Users/.../Desktop/目标文件夹/文档.docx"
```

## Expanding to Other OOXML Formats

The same pattern applies to **.xlsx** and **.pptx** — just change the XML parts:

| Format | Core parts | Content Type |
|--------|-----------|--------------|
| .docx | word/document.xml | `wordprocessingml.document.main+xml` |
| .xlsx | xl/workbook.xml, xl/worksheets/sheet1.xml | `spreadsheetml.sheet.main+xml` |
| .pptx | ppt/presentation.xml, ppt/slides/slide1.xml | `presentationml.presentation.main+xml` |

## Pitfalls

1. **PowerShell + Chinese paths** — `[System.IO.File]::Open()` and `[System.IO.Compression.ZipFile]::OpenRead()` throw `ArgumentException: path contains illegal characters` when the path has Chinese characters. Always build to an ASCII-only temp path and move.
2. **`CreateFromDirectory` backslash trap** — this method uses `\\` path separators in ZIP entries, which violates the OOXML standard. Use manual entry creation with forward slashes.
3. **`python` in terminal is blocked** — the Windows Store `python.exe` shim blocks calls in git-bash. But `execute_code` uses the Hermes embedded Python which HAS python-docx. Always prefer `execute_code` for docx creation over terminal `python`.
4. **No `zip` command** in git-bash/MSYS. Use PowerShell's .NET compression instead.
5. **PowerShell script encoding** — when writing .ps1 scripts via `cat > file`, the heredoc content may be in a different encoding. For simple scripts inline is fine; for complex scripts, write the .ps1 file via `write_file` tool and then execute it.
6. **Verify the ZIP structure** — after creation, always verify that entries use forward slashes and the required minimum parts are present. A docx missing `[Content_Types].xml` at root will be silently treated as a corrupt file by Word.