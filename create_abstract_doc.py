import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    """Sets background color of a table cell."""
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Sets cell padding in dxa (1 pt = 20 dxa)."""
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_cell_border(cell, **kwargs):
    """
    kwargs can be top, bottom, left, right.
    Format: {"val": "single", "sz": "4", "color": "HEX", "space": "0"}
    """
    tcPr = cell._element.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}/>')
    for border_name, border_props in kwargs.items():
        val = border_props.get("val", "single")
        sz = border_props.get("sz", "4")
        color = border_props.get("color", "auto")
        b_el = parse_xml(f'<w:{border_name} {nsdecls("w")} w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>')
        tcBorders.append(b_el)
    tcPr.append(tcBorders)

def add_heading_with_accent(doc, text, level=1):
    h = doc.add_paragraph()
    h.paragraph_format.space_before = Pt(8)
    h.paragraph_format.space_after = Pt(3)
    h.paragraph_format.keep_with_next = True
    
    run = h.add_run(text)
    run.font.name = 'Arial'
    run.font.bold = True
    
    if level == 1:
        run.font.size = Pt(11.5)
        run.font.color.rgb = RGBColor(16, 44, 87) # Deep Navy
    else:
        run.font.size = Pt(10.5)
        run.font.color.rgb = RGBColor(28, 80, 140)
    return h

def create_document(output_path):
    doc = docx.Document()
    
    # Page setup - A4 with 0.6 in (approx 15.2mm) margins to ensure exact 2-page fit
    for section in doc.sections:
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.top_margin = Inches(0.55)
        section.bottom_margin = Inches(0.55)
        section.left_margin = Inches(0.65)
        section.right_margin = Inches(0.65)
        
        # Add subtle footer
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("SIH 2026 | Team Cyber Sentinels | Problem Statement ID: SIH26106")
        f_run.font.name = 'Calibri'
        f_run.font.size = Pt(8)
        f_run.font.color.rgb = RGBColor(130, 130, 130)

    # Base Normal Style
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(9.5)
    normal_style.font.color.rgb = RGBColor(35, 35, 35)
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(3.5)

    # ------------------ PAGE 1 HEADER BANNER ------------------
    # Header Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(1)
    
    r_org = p_title.add_run("SMART INDIA HACKATHON 2026 — STAGE 1 ABSTRACT\n")
    r_org.font.name = 'Arial'
    r_org.font.size = Pt(10)
    r_org.font.bold = True
    r_org.font.color.rgb = RGBColor(190, 80, 20) # Saffron / Orange SIH accent
    
    r_main = p_title.add_run("SENTINEL-X: AI-Powered Email Forensics, Origin GeoLocation & Threat Intelligence Platform")
    r_main.font.name = 'Arial'
    r_main.font.size = Pt(13)
    r_main.font.bold = True
    r_main.font.color.rgb = RGBColor(16, 44, 87) # Deep Navy

    # Meta Table (2x2 Grid with clean border and background)
    meta_table = doc.add_table(rows=2, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    
    col_widths = [Inches(3.45), Inches(3.45)]
    meta_data = [
        [("Problem Statement ID:", " SIH26106"), ("Category & Theme:", " Software | Blockchain & Cybersecurity")],
        [("Team ID & Name:", " SIH2026033 | Cyber Sentinels"), ("Motto:", " Detect. Defend. Decentralize.")]
    ]
    
    for r_idx, row in enumerate(meta_table.rows):
        row.height = Inches(0.24)
        for c_idx, cell in enumerate(row.cells):
            cell.width = col_widths[c_idx]
            set_cell_background(cell, "F2F5F9")
            set_cell_margins(cell, top=60, bottom=60, left=120, right=120)
            set_cell_border(cell, 
                            top={"val": "single", "sz": "3", "color": "D0D9E5"},
                            bottom={"val": "single", "sz": "3", "color": "D0D9E5"},
                            left={"val": "single", "sz": "3", "color": "D0D9E5"},
                            right={"val": "single", "sz": "3", "color": "D0D9E5"})
            
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            
            lbl, val = meta_data[r_idx][c_idx]
            r1 = p.add_run(lbl)
            r1.font.bold = True
            r1.font.size = Pt(8.5)
            r1.font.color.rgb = RGBColor(16, 44, 87)
            
            r2 = p.add_run(val)
            r2.font.size = Pt(8.5)
            r2.font.color.rgb = RGBColor(50, 50, 50)

    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(2)
    p_spacer.paragraph_format.space_after = Pt(0)

    # ------------------ 1. PROBLEM STATEMENT ------------------
    add_heading_with_accent(doc, "1. PROBLEM STATEMENT & BACKGROUND CHALLENGES", level=1)
    
    p_prob = doc.add_paragraph()
    p_prob.add_run(
        "Email vectors account for over 90% of targeted enterprise cyber intrusions, serving as the launchpad for Business "
        "Email Compromise (BEC), credential harvesting, supply-chain fraud, and ransomware distribution. While organizations "
        "invest heavily in Secure Email Gateways (SEGs) and signature-based antivirus perimeter filters, adversaries continuously "
        "bypass static rule engines using newly registered lookalike domains, zero-reputation relays, and generative AI-crafted "
        "social engineering lures that contain no blacklisted links or malware payloads."
    )
    
    p_prob2 = doc.add_paragraph()
    p_prob2.add_run(
        "When suspicious emails bypass inbound gateways, Security Operations Centers (SOCs) encounter three critical operational bottlenecks:"
    )
    
    bullet_items_1 = [
        ("Exhaustive Manual Triage (High MTTR): ", "Forensic examination of a single suspicious .eml artifact requires 30 to 45 minutes of manual labor. Analysts must unpack nested MIME structures, trace multi-hop Received headers, query disconnected OSINT databases, and verify cryptographic SPF/DKIM/DMARC alignment across conflicting domains."),
        ("Absence of Threat Origin Visibility: ", "Legacy security gateways produce binary verdicts ('Quarantined' or 'Safe') without illuminating the attacker's physical or logical infrastructure. Incident responders are left blind regarding the originating IP, Autonomous System Number (ASN), BGP routing topology, and hosting ISP."),
        ("Compromised Chain-of-Custody: ", "Traditional investigation notes, volatile text logs, and standard ticketing records are easily tampered with or corrupted. In forensic and legal post-mortems, digital evidence routinely fails strict statutory integrity and chain-of-custody standards (such as Section 65B of the Indian Evidence Act and ISO/IEC 27037).")
    ]
    for bold_prefix, text in bullet_items_1:
        p_b = doc.add_paragraph(style='List Bullet')
        p_b.paragraph_format.space_before = Pt(1)
        p_b.paragraph_format.space_after = Pt(2)
        p_b.paragraph_format.left_indent = Inches(0.2)
        r_pre = p_b.add_run(bold_prefix)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(20, 55, 100)
        p_b.add_run(text)

    # ------------------ 2. PROPOSED SOLUTION ------------------
    add_heading_with_accent(doc, "2. PROPOSED SOLUTION: SENTINEL-X", level=1)
    
    p_sol = doc.add_paragraph()
    p_sol.add_run(
        "SENTINEL-X is an automated, sovereign email forensics and threat intelligence platform designed to slash incident response times "
        "from 45 minutes to under 30 seconds. Rather than functioning as a black-box filter that merely discards mail, Sentinel-X answers "
        "two vital questions for the security analyst: "
    )
    r_q = p_sol.add_run('"Why is this email suspicious—and where did it come from?"')
    r_q.font.bold = True
    r_q.font.color.rgb = RGBColor(16, 44, 87)

    p_sol2 = doc.add_paragraph()
    p_sol2.add_run("The platform converges five specialized forensic operations into an integrated, evidence-backed pipeline:")

    sol_bullets = [
        ("Deep Multi-Hop Header Forensics: ", "Recursively dissects RFC 822/MIME headers, exposing display-name spoofing, Reply-To redirects, hidden Return-Path mismatches, and cryptographic authentication failures across SPF, DKIM, and DMARC protocols."),
        ("Dual-Layer Cognitive AI Engine: ", "Merges lightweight NLP tokenizers with contextual Large Language Models (spaCy, Gemini, and Nemotron) to detect semantic manipulation, coercion, fake invoice patterns, and executive impersonation that evade keyword filters."),
        ("Origin Confidence & Geolocation Engine: ", "Performs hop-by-hop relay traversal backward through the SMTP transmission path. It extracts true edge relay IPs, calculating an Origin Confidence Score alongside ASN, BGP routing data, and physical geographic coordinates."),
        ("Correlated Threat Graph: ", "Dynamically maps multi-vector relationships (Sender → Intermediate Relay → Malicious Host → URL → Threat Campaign) using graph modeling, enabling analysts to visualize coordinated campaign activity."),
        ("Cryptographic Chain-of-Custody Vault: ", "Anchors forensic reports and raw email artifacts with deterministic SHA-256 hashes registered in an immutable ledger structure, guaranteeing court-admissible audit trails complying with statutory cyber law.")
    ]
    for b_title, b_desc in sol_bullets:
        p_sb = doc.add_paragraph(style='List Bullet')
        p_sb.paragraph_format.space_before = Pt(1)
        p_sb.paragraph_format.space_after = Pt(2)
        p_sb.paragraph_format.left_indent = Inches(0.2)
        r_pre = p_sb.add_run(b_title)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(20, 55, 100)
        p_sb.add_run(b_desc)

    # ------------------ PAGE BREAK TO EXACTLY PAGE 2 ------------------
    doc.add_page_break()

    # ------------------ PAGE 2 HEADER ------------------
    p_p2_hdr = doc.add_paragraph()
    p_p2_hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_p2_hdr.paragraph_format.space_before = Pt(0)
    p_p2_hdr.paragraph_format.space_after = Pt(4)
    r_p2 = p_p2_hdr.add_run("SENTINEL-X | Technical Methodology, Architecture & Viability")
    r_p2.font.name = 'Arial'
    r_p2.font.size = Pt(8.5)
    r_p2.font.color.rgb = RGBColor(120, 120, 120)

    # ------------------ 3. METHODOLOGY / ARCHITECTURE ------------------
    add_heading_with_accent(doc, "3. METHODOLOGY & SYSTEM ARCHITECTURE", level=1)
    
    p_arch = doc.add_paragraph()
    p_arch.add_run(
        "Sentinel-X operates through an event-driven, five-tier forensic pipeline designed for real-time triage, explainable risk scoring, "
        "and court-grade evidentiary preservation:"
    )

    arch_steps = [
        ("Level 1 & 2 — Ingestion & Normalization: ", "Suspicious emails enter the system through end-user ticket submissions (.eml upload) or automated mailbox webhooks (Google Workspace / Microsoft 365 APIs). The parser validates MIME compliance and separates raw RFC 822 headers, HTML/plain-text bodies, and attachments into sandboxed inspection environments."),
        ("Level 3 — Parallel Forensic & NLP Analysis: ", "A bifurcated analysis engine executes concurrently: (a) The Forensic Module audits multi-hop Received headers, resolves DNS MX records, and verifies SPF/DKIM cryptographic signatures; (b) The NLP/LLM Module evaluates semantic intent, flagging cognitive manipulation, urgency cues, and lookalike domain permutations."),
        ("Level 4 — Threat Intelligence & Origin Correlation: ", "Observed external IPs, hostnames, and URLs are cross-referenced across live threat intelligence feeds (VirusTotal, Cisco Talos, WHOIS/RDAP). An Origin Confidence algorithm discards internal RFC 1918 hops, isolates the perimeter ingress node, and attributes ASN, ISP, and geographic telemetry."),
        ("Level 5 — Graph Synthesis, Verdict & Remediation: ", "Correlated artifacts are projected onto an interactive Attack Graph (React Flow) linking compromised accounts to infrastructure clusters. A composite 0–100 Risk Score is generated. Analysts can execute 1-click containment (automated mail purge, firewall IP blocking) and export tamper-evident forensic dossiers.")
    ]
    for st_title, st_desc in arch_steps:
        p_st = doc.add_paragraph(style='List Bullet')
        p_st.paragraph_format.space_before = Pt(1)
        p_st.paragraph_format.space_after = Pt(2)
        p_st.paragraph_format.left_indent = Inches(0.2)
        r_pre = p_st.add_run(st_title)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(20, 55, 100)
        p_st.add_run(st_desc)

    # ------------------ 4. TECH STACK ------------------
    add_heading_with_accent(doc, "4. TECHNOLOGY STACK", level=1)

    tech_table = doc.add_table(rows=7, cols=3)
    tech_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    tech_table.autofit = False

    t_widths = [Inches(1.8), Inches(2.2), Inches(2.9)]
    headers = ["Layer / Component", "Technology Selected", "Technical Function & Rationale"]
    
    # Table Header Row
    hdr_row = tech_table.rows[0]
    hdr_row.height = Inches(0.24)
    for c_idx, cell in enumerate(hdr_row.cells):
        cell.width = t_widths[c_idx]
        set_cell_background(cell, "102C57")
        set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
        set_cell_border(cell, 
                        top={"val": "single", "sz": "4", "color": "102C57"},
                        bottom={"val": "single", "sz": "4", "color": "102C57"},
                        left={"val": "none"}, right={"val": "none"})
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(headers[c_idx])
        run.font.bold = True
        run.font.size = Pt(8.5)
        run.font.color.rgb = RGBColor(255, 255, 255)

    table_data = [
        ("Frontend Console", "Next.js 14, React, Tailwind CSS", "High-performance SOC analyst dashboard with sub-second page transitions."),
        ("Graph Visualization", "React Flow, Recharts", "Dynamic entity correlation graphs (Sender → IP → URL → Campaign) and metric feeds."),
        ("Backend Services", "Python 3.11, FastAPI, Uvicorn", "High-concurrency asynchronous API processing MIME payloads and threat enrichment."),
        ("Forensics & Parsing", "email, dnspython, authres", "RFC-standard header parsing, DNS MX validation, and SPF/DKIM/DMARC verification."),
        ("AI / ML / NLP", "PyTorch, spaCy, Gemini & Nemotron", "Dual-tier NLP intent classification, urgency scoring, and zero-day lure detection."),
        ("Evidence & Database", "Supabase (PostgreSQL), SHA-256 Ledger", "Relational storage for incident cases paired with an immutable chain-of-custody vault.")
    ]

    for r_idx, row_data in enumerate(table_data):
        row = tech_table.rows[r_idx + 1]
        row.height = Inches(0.22)
        bg = "FFFFFF" if r_idx % 2 == 0 else "F6F8FB"
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.width = t_widths[c_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=50, bottom=50, left=100, right=100)
            set_cell_border(cell, 
                            bottom={"val": "single", "sz": "2", "color": "E0E6ED"},
                            left={"val": "none"}, right={"val": "none"}, top={"val": "none"})
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            run = p.add_run(val)
            run.font.size = Pt(8.5)
            if c_idx == 0:
                run.font.bold = True
                run.font.color.rgb = RGBColor(20, 55, 100)
            else:
                run.font.color.rgb = RGBColor(45, 45, 45)

    p_spacer2 = doc.add_paragraph()
    p_spacer2.paragraph_format.space_before = Pt(2)
    p_spacer2.paragraph_format.space_after = Pt(0)

    # ------------------ 5. FEASIBILITY & SCALABILITY ------------------
    add_heading_with_accent(doc, "5. FEASIBILITY, SCALABILITY & NATIONAL IMPACT", level=1)

    feas_points = [
        ("Technical Feasibility: ", "The platform is built on established, proven internet standards (IETF RFC 7208/6376/7489, NIST SP 800-177, MITRE ATT&CK T1566). The functional prototype already demonstrates real-time parsing, automated relay hops extraction, interactive attack graphs, and cryptographic ledger verification."),
        ("Enterprise Scalability: ", "Engineered with stateless asynchronous microservices. Background workers independently execute CPU-intensive NLP inference and network-bound threat lookups via non-blocking queues, supporting horizontal throughput capable of handling 50,000+ corporate emails per hour with local caching to minimize external API overhead."),
        ("Statutory & Legal Admissibility: ", "Complies directly with Section 65B of the Indian Evidence Act, ISO/IEC 27037 standards for digital evidence handling, and CERT-In cyber incident reporting directives. Every report generates an exportable, tamper-evident cryptographic dossier admissible in legal proceedings."),
        ("Strategic Beneficiaries: ", "Specifically engineered for sovereign defense and critical infrastructure: Government & Defense (NIC, CERT-In, Armed Forces against state-sponsored APTs), BFSI (preventing multi-crore unauthorized wire fraud and BEC), and MSMEs requiring enterprise-tier SOC intelligence without prohibitive licensing overhead.")
    ]
    for f_title, f_desc in feas_points:
        p_fb = doc.add_paragraph(style='List Bullet')
        p_fb.paragraph_format.space_before = Pt(1)
        p_fb.paragraph_format.space_after = Pt(2)
        p_fb.paragraph_format.left_indent = Inches(0.2)
        r_pre = p_fb.add_run(f_title)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(20, 55, 100)
        p_fb.add_run(f_desc)

    doc.save(output_path)
    print(f"Document successfully created at: {output_path}")

if __name__ == "__main__":
    target = r"g:\Project-Sentinel-X7-main\Sentinel-X7-main\Sentinel-X_Abstract_SIH2026.docx"
    create_document(target)
