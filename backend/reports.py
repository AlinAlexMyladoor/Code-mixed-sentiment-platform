import os
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from sqlalchemy import func
from database import SessionLocal
from models import ProcessedComment


def _make_footer(canvas, doc):
    """Draws a clean footer with page number on every page."""
    canvas.saveState()
    page_width, page_height = letter
    footer_text = "SwaraSense Sentiment Intelligence  —  Confidential AI Report"
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#94a3b8"))
    canvas.drawString(inch * 0.75, inch * 0.5, footer_text)
    page_num = f"Page {doc.page}"
    canvas.drawRightString(page_width - inch * 0.75, inch * 0.5, page_num)
    # Separator line above footer
    canvas.setStrokeColor(colors.HexColor("#e2e8f0"))
    canvas.setLineWidth(0.5)
    canvas.line(inch * 0.75, inch * 0.65, page_width - inch * 0.75, inch * 0.65)
    canvas.restoreState()


def generate_weekly_report():
    """Generates a PDF report summarizing the last 7 days of sentiment data."""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)

        # 1. Fetch data
        total_comments = (
            db.query(func.count(ProcessedComment.id))
            .filter(ProcessedComment.created_at >= seven_days_ago)
            .scalar()
            or 0
        )

        sentiments = (
            db.query(ProcessedComment.sentiment, func.count(ProcessedComment.id))
            .filter(ProcessedComment.created_at >= seven_days_ago)
            .group_by(ProcessedComment.sentiment)
            .all()
        )
        sentiment_dict = {s: c for s, c in sentiments}

        # Compute top friction points from negative aspect signals
        negative_count  = sentiment_dict.get("negative", 0)
        sarcastic_count = sentiment_dict.get("sarcastic", 0)

        # 2. Build PDF
        os.makedirs("reports", exist_ok=True)
        filename = f"reports/SwaraSense_Weekly_{now.strftime('%Y%m%d')}.pdf"
        doc = SimpleDocTemplate(
            filename,
            pagesize=letter,
            rightMargin=inch * 0.75,
            leftMargin=inch * 0.75,
            topMargin=inch,
            bottomMargin=inch,
        )
        styles = getSampleStyleSheet()

        # ── Custom Styles ──────────────────────────────────────────────────
        title_style = ParagraphStyle(
            "TitleStyle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            spaceAfter=4,
            textColor=colors.HexColor("#0f172a"),
        )
        subtitle_style = ParagraphStyle(
            "SubtitleStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=18,
        )
        h2_style = ParagraphStyle(
            "H2Style",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            spaceBefore=18,
            spaceAfter=8,
            textColor=colors.HexColor("#1e293b"),
        )
        body_style = ParagraphStyle(
            "BodyStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=16,
            textColor=colors.HexColor("#334155"),
        )
        briefing_style = ParagraphStyle(
            "BriefingStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=16,
            textColor=colors.HexColor("#475569"),
            leftIndent=10,
            borderPad=10,
            backColor=colors.HexColor("#f8fafc"),
            borderColor=colors.HexColor("#e2e8f0"),
            borderWidth=1,
            borderRadius=4,
            spaceBefore=4,
            spaceAfter=4,
        )
        bullet_style = ParagraphStyle(
            "BulletStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=16,
            textColor=colors.HexColor("#374151"),
            leftIndent=16,
            spaceBefore=3,
        )

        elements = []

        # ── Title & Header ─────────────────────────────────────────────────
        elements.append(Paragraph("SwaraSense Weekly Executive Report", title_style))
        elements.append(Paragraph(
            f"Generated: {now.strftime('%B %d, %Y')}  ·  Period: Last 7 days",
            subtitle_style,
        ))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=16))

        # ── Executive Briefing ─────────────────────────────────────────────
        elements.append(Paragraph("Executive Briefing", h2_style))
        elements.append(Paragraph(
            f"This week's monitoring processed <b>{total_comments:,}</b> interactions. "
            f"Review the top friction points below to identify emerging customer experience bottlenecks.",
            body_style,
        ))
        elements.append(Spacer(1, 10))

        # ── Sentiment Breakdown Table ──────────────────────────────────────
        elements.append(Paragraph("Sentiment Breakdown", h2_style))

        data = [["Sentiment", "Comments", "Share"]]
        total_for_pct = max(total_comments, 1)
        for sent in ["positive", "negative", "sarcastic", "neutral"]:
            count = sentiment_dict.get(sent, 0)
            pct = f"{(count / total_for_pct * 100):.1f}%"
            data.append([sent.capitalize(), f"{count:,}", pct])

        table = Table(data, colWidths=[200, 120, 100])
        table.setStyle(TableStyle([
            # Header row
            ("BACKGROUND",    (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.HexColor("#475569")),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, 0), 9),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
            ("TOPPADDING",    (0, 0), (-1, 0), 10),
            # Body rows
            ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",      (0, 1), (-1, -1), 10),
            ("TOPPADDING",    (0, 1), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 9),
            ("TEXTCOLOR",     (0, 1), (-1, -1), colors.HexColor("#1e293b")),
            # Alignment
            ("ALIGN",         (1, 0), (-1, -1), "CENTER"),
            ("ALIGN",         (0, 0), (0, -1), "LEFT"),
            ("LEFTPADDING",   (0, 0), (0, -1), 12),
            # Horizontal lines only
            ("LINEBELOW",     (0, 0), (-1, 0), 1, colors.HexColor("#e2e8f0")),
            ("LINEBELOW",     (0, 1), (-1, -2), 0.5, colors.HexColor("#f1f5f9")),
            # Outer border
            ("BOX",           (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
        ]))
        elements.append(table)

        # ── Top Friction Points ────────────────────────────────────────────
        elements.append(Paragraph("Top Operational Friction Points", h2_style))
        elements.append(Paragraph(
            f"Based on {negative_count + sarcastic_count:,} negative and sarcastic signals this week, "
            "the following areas represent the highest friction in customer experience:",
            body_style,
        ))
        elements.append(Spacer(1, 8))

        aspect_counts = {}
        recent_negative_comments = db.query(ProcessedComment.aspect_sentiments).filter(
            ProcessedComment.created_at >= seven_days_ago,
            ProcessedComment.sentiment.in_(["negative", "sarcastic"])
        ).all()

        for (aspects,) in recent_negative_comments:
            if aspects and isinstance(aspects, dict):
                for aspect in aspects.keys():
                    aspect_counts[aspect] = aspect_counts.get(aspect, 0) + 1

        top_aspects = sorted(aspect_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        
        if not top_aspects:
            friction_points = ["No major friction points detected this week."]
        else:
            friction_points = [f"{aspect.capitalize()} - {count} complaints" for aspect, count in top_aspects]

        for point in friction_points:
            elements.append(Paragraph(f"•  {point}", bullet_style))

        elements.append(Spacer(1, 20))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0"), spaceAfter=12))
        elements.append(Paragraph(
            "This is an automated report generated by SwaraSense Sentiment Intelligence. "
            "Data reflects processed comments for the specified period only.",
            ParagraphStyle("Footer", parent=styles["Normal"], fontName="Helvetica", fontSize=8, textColor=colors.HexColor("#94a3b8")),
        ))

        # 3. Build with footer on every page
        doc.build(elements, onFirstPage=_make_footer, onLaterPages=_make_footer)
        print(f"Weekly PDF generated at {filename}")
        return filename

    except Exception as e:
        print(f"Error generating report: {e}")
        return None
    finally:
        db.close()
