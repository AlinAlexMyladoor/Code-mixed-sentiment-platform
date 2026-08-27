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
            'PremiumTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=20,
            textColor=colors.HexColor("#0f172a"), # Deep Slate
            spaceAfter=10
        )
        
        subtitle_style = ParagraphStyle(
            'PremiumDate',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            textColor=colors.HexColor("#64748b"), # Muted Slate
            spaceAfter=25
        )
        
        h2_style = ParagraphStyle(
            'PremiumHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=10,
            spaceBefore=15
        )
        
        body_style = ParagraphStyle(
            'PremiumBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            textColor=colors.HexColor("#334155"),
            leading=16,
            spaceAfter=15
        )
        
        bullet_style = ParagraphStyle(
            "BulletStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            textColor=colors.HexColor("#334155"),
            leftIndent=16,
            spaceBefore=3,
        )

        elements = []

        # ── Title & Header ─────────────────────────────────────────────────
        elements.append(Paragraph("SwaraSense Weekly Executive Report", title_style))
        elements.append(Paragraph(
            f"Generated on: {now.strftime('%B %d, %Y')} • Period: Last 7 days",
            subtitle_style,
        ))

        # ── Executive Briefing ─────────────────────────────────────────────
        elements.append(Paragraph("Executive Briefing", h2_style))
        elements.append(Paragraph(
            f"This week's monitoring processed <b>{total_comments:,}</b> interactions. "
            f"Review the sentiment breakdown and top operational friction points below to identify emerging customer experience bottlenecks.",
            body_style,
        ))

        # ── Sentiment Breakdown Table ──────────────────────────────────────
        elements.append(Paragraph("Sentiment Breakdown", h2_style))

        data = [["Sentiment", "Comments", "Share"]]
        total_for_pct = max(total_comments, 1)
        for sent in ["positive", "negative", "sarcastic", "neutral"]:
            count = sentiment_dict.get(sent, 0)
            pct = f"{(count / total_for_pct * 100):.1f}%"
            data.append([sent.capitalize(), f"{count:,}", pct])

        table = Table(data, colWidths=[150, 100, 100])
        table.setStyle(TableStyle([
            # Header row styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")), # Ultra light slate
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#475569")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            
            # Body row styling
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor("#334155")),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            
            # Grid lines (Very subtle)
            ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor("#cbd5e1")), # Thicker header line
            ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")), # Thin body lines
            
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'), # Center numbers
        ]))
        elements.append(table)
        elements.append(Spacer(1, 20))

        # ── Top Friction Points ────────────────────────────────────────────
        elements.append(Paragraph("Top Operational Friction Points", h2_style))
        elements.append(Paragraph(
            "Based on the negative and sarcastic signals this week, the following areas represent the highest friction in the customer experience:",
            body_style,
        ))

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
            elements.append(Paragraph("• No major friction points detected this week.", body_style))
        else:
            for aspect, count in top_aspects:
                bullet = f"• <b>{aspect.capitalize()}</b> - {count} complaints"
                elements.append(Paragraph(bullet, body_style))

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
