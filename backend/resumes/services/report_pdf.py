from __future__ import annotations

from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def safe_text(value: Any) -> str:
    if value is None:
        return ''
    if isinstance(value, (list, tuple)):
        return ', '.join(safe_text(item) for item in value if safe_text(item))
    if isinstance(value, dict):
        preferred = (
            value.get('strength')
            or value.get('weakness')
            or value.get('skill')
            or value.get('name')
            or value.get('label')
            or value.get('title')
            or value.get('requirement')
            or value.get('recommendation')
            or value.get('suggestion')
            or value.get('action')
            or value.get('text')
            or value.get('value')
            or value.get('explanation')
            or value.get('feedback')
        )
        if preferred is not None and preferred is not value:
            return safe_text(preferred)
        return ', '.join(f'{key}: {safe_text(val)}' for key, val in value.items() if str(key).lower() not in {'evidence', 'reason'})
    return str(value)


def bullet_list(items: list[Any], styles: dict[str, ParagraphStyle], empty: str = 'No items reported.') -> list[Any]:
    output: list[Any] = []
    clean_items = [safe_text(item) for item in (items or []) if safe_text(item)]
    if not clean_items:
        output.append(Paragraph(empty, styles['Body']))
        return output
    for item in clean_items:
        output.append(Paragraph(f'• {item}', styles['Body']))
    return output


def score_table(rows: list[list[Any]], widths: list[float]) -> Table:
    table = Table(rows, colWidths=widths)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
        ('GRID', (0, 0), (-1, -1), 0.35, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    return table


def group_fix_text(group: dict[str, Any]) -> str:
    return safe_text(group.get('issues') or group.get('tips') or group.get('missing') or []) or 'No issues reported.'


def build_report_pdf(report) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
    )
    base_styles = getSampleStyleSheet()
    styles = {
        'Title': ParagraphStyle('CareerLensTitle', parent=base_styles['Title'], fontSize=22, leading=26, spaceAfter=12),
        'Heading': ParagraphStyle('CareerLensHeading', parent=base_styles['Heading2'], fontSize=14, leading=18, spaceBefore=12, spaceAfter=6),
        'SubHeading': ParagraphStyle('CareerLensSubHeading', parent=base_styles['Heading3'], fontSize=11, leading=14, spaceBefore=8, spaceAfter=4),
        'Body': ParagraphStyle('CareerLensBody', parent=base_styles['BodyText'], fontSize=9.5, leading=13, spaceAfter=4),
        'Small': ParagraphStyle('CareerLensSmall', parent=base_styles['BodyText'], fontSize=8.5, leading=11),
    }

    ats = report.ats_result or {}
    ai = report.ai_result or {}
    ats_summary = ats.get('summary', {}) or {}
    recruiter_tips = ats_summary.get('recruiter_tips', {}) or {}
    contact_info = ats_summary.get('contact_info', {}) or {}
    issue_groups = ats.get('issue_groups', {}) or {}
    story: list[Any] = []

    story.append(Paragraph('CareerLens Strict ATS and Human AI Analysis Report', styles['Title']))
    story.append(Paragraph(f'Resume: {report.resume.original_name}', styles['Body']))
    story.append(Paragraph(f'Job title: {report.job_title}', styles['Body']))
    story.append(Paragraph(f'Created: {report.created_at:%Y-%m-%d %H:%M}', styles['Body']))
    story.append(Spacer(1, 0.12 * inch))

    summary_rows = [
        [Paragraph('Score', styles['SubHeading']), Paragraph('Level', styles['SubHeading']), Paragraph('Meaning', styles['SubHeading'])],
        [
            Paragraph(f"{ats.get('job_match_score', ats.get('overall_score', 0))}%", styles['Heading']),
            Paragraph(safe_text(ats.get('job_match_level', ats.get('match_level', 'Unknown'))), styles['Heading']),
            Paragraph('Rule-based ATS score using exact job-description keywords and exact job-title matching.', styles['Small']),
        ],
        [
            Paragraph(f"{ats.get('ats_readability_score', ats_summary.get('ats_readability_score', 0))}%", styles['Heading']),
            Paragraph(safe_text(ats.get('ats_readability_level', ats_summary.get('ats_readability_level', 'Unknown'))), styles['Heading']),
            Paragraph('ATS readability and searchability are reported separately.', styles['Small']),
        ],
    ]
    summary_table = Table(summary_rows, colWidths=[1.4 * inch, 1.4 * inch, 4.0 * inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E0F2FE')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(summary_table)

    story.append(Paragraph('How to Use This Report', styles['Heading']))
    story.append(Paragraph('To improve the ATS score, follow the Top Fixes and ATS Checklist. Gemini AI analysis is separate human/recruiter context and does not change the rule-based score.', styles['Body']))

    story.append(Paragraph('Top ATS Fixes', styles['Heading']))
    story.extend(bullet_list(ats_summary.get('top_fixes', []), styles, empty='No priority fixes reported.'))

    checklist_rows = [[
        Paragraph('ATS Area', styles['SubHeading']),
        Paragraph('Status', styles['SubHeading']),
        Paragraph('Issues', styles['SubHeading']),
        Paragraph('Fix these items', styles['SubHeading']),
    ]]
    for key in ['searchability', 'hard_skills', 'soft_skills', 'recruiter_tips', 'formatting']:
        group = issue_groups.get(key, {}) or {}
        checklist_rows.append([
            Paragraph(safe_text(group.get('name') or key.replace('_', ' ').title()), styles['Small']),
            Paragraph(safe_text(group.get('status') or group.get('level') or ''), styles['Small']),
            Paragraph(str(group.get('issues_to_fix', 0)), styles['Small']),
            Paragraph(group_fix_text(group), styles['Small']),
        ])
    story.append(Paragraph('ATS Checklist', styles['Heading']))
    story.append(score_table(checklist_rows, [1.25 * inch, 0.9 * inch, 0.55 * inch, 4.1 * inch]))

    story.append(Paragraph('Contact Information Extracted', styles['Heading']))
    contact_rows = [
        [Paragraph('Email', styles['SubHeading']), Paragraph('Phone', styles['SubHeading']), Paragraph('Location', styles['SubHeading'])],
        [Paragraph(safe_text(contact_info.get('email') or 'Not detected'), styles['Small']), Paragraph(safe_text(contact_info.get('phone') or 'Not detected'), styles['Small']), Paragraph(safe_text(contact_info.get('location') or 'Not detected'), styles['Small'])],
    ]
    story.append(score_table(contact_rows, [2.3 * inch, 1.8 * inch, 2.7 * inch]))

    story.append(Paragraph('Recruiter Tips', styles['Heading']))
    story.extend(bullet_list(recruiter_tips.get('tips', []), styles, empty='No recruiter tips reported.'))

    story.append(Paragraph('Gemini AI Analysis - Human/Recruiter Context Only', styles['Heading']))
    story.append(Paragraph('This section may help recruiters understand the candidate beyond exact ATS matching. It is not used to calculate the ATS score.', styles['Body']))
    story.append(Paragraph(safe_text(ai.get('summary_10_second_read') or ai.get('message') or 'No AI summary available.'), styles['Body']))
    story.append(Paragraph('Human-Review Strengths', styles['SubHeading']))
    story.extend(bullet_list(ai.get('strengths', []), styles))
    story.append(Paragraph('Human-Review Gaps', styles['SubHeading']))
    story.extend(bullet_list(ai.get('weaknesses', []), styles))
    story.append(Paragraph('Human-Review Recommendations', styles['SubHeading']))
    story.extend(bullet_list(ai.get('recommendations', []), styles))

    story.append(Paragraph('Note', styles['Heading']))
    story.append(Paragraph('CareerLens separates strict ATS matching, ATS readability, recruiter tips, and Gemini AI analysis. Add only truthful keywords and responsibilities to a resume.', styles['Body']))

    doc.build(story)
    return buffer.getvalue()
