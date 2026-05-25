import os
import io
import re
import json
import uuid
import logging
import urllib.request
from datetime import datetime, timedelta
from collections import defaultdict
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak, CondPageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from PIL import Image as PILImage

from app.config import settings
from app.models import Enquiry, Package, Agent

# Try importing shared configurations from agent_settings, fallback if needed
try:
    from app.api.v1.agent_settings import (
        _migrate_pdf_customizer,
        extract_package_inclusions_exclusions,
        DEFAULT_DOMESTIC_SETTINGS,
        DEFAULT_INTERNATIONAL_SETTINGS,
        _clean_str,
        _clean_color,
        _hex_to_rgb,
        get_active_slots,
        download_image,
        _IMAGE_CACHE,
        _cache_get,
        _cache_put,
        _cache_is_expired,
        get_image_cache_stats,
        FooterCanvas
    )
except ImportError:
    DEFAULT_DOMESTIC_SETTINGS = {
        'logo_position': 'top_left', 'logo_url': '',
        'primary_color': '#1a5276', 'accent_color': '#f39c12',
        'font_style': 'modern', 'show_footer': True,
        'itinerary_layout': 'vertical',
        'time_slots': {
            'morning': {'enabled': True, 'label': 'Morning'},
            'afternoon': {'enabled': True, 'label': 'Afternoon'},
            'evening': {'enabled': True, 'label': 'Evening'},
            'night': {'enabled': True, 'label': 'Night'},
            'full_day': {'enabled': True, 'label': 'Full Day'},
        },
        'content_visibility': {
            'show_inclusions': True, 'show_exclusions': True,
            'show_cancellation': True, 'show_activity_images': True,
        },
        'sections': [
            {'id': 'header', 'label': 'Header / Cover Block', 'visible': True},
            {'id': 'itinerary', 'label': 'Itinerary (Day-wise)', 'visible': True},
            {'id': 'inclusions', 'label': 'Inclusions', 'visible': True},
            {'id': 'exclusions', 'label': 'Exclusions', 'visible': True},
            {'id': 'pricing', 'label': 'Pricing Table', 'visible': True},
            {'id': 'cancellation', 'label': 'Cancellation Policy', 'visible': True},
            {'id': 'terms', 'label': 'Terms & Conditions', 'visible': True},
        ],
        'terms': {'show': True, 'use_global': True, 'custom_text': ''},
        'extra_sections': [
            { 'id': 'dom-1', 'heading': 'Local Transport',       'content': 'Standard AC Sedan/SUV for sightseeing and transfers as per itinerary.', 'show': True },
            { 'id': 'dom-2', 'heading': 'Flight & Train Details','content': 'Domestic flight/train tickets are not included unless specified.', 'show': True },
            { 'id': 'dom-3', 'heading': 'GST Breakdown',         'content': 'GST applicable at 18% total (9% CGST + 9% SGST).', 'show': True },
            { 'id': 'dom-4', 'heading': 'State Permit Notes',    'content': 'Certain regions require inner line permits. Details shared on booking.', 'show': False },
            { 'id': 'dom-5', 'heading': 'Regional Notes',        'content': 'Local customs and dress codes apply at religious and heritage sites.', 'show': False },
        ]
    }

    DEFAULT_INTERNATIONAL_SETTINGS = {
        'logo_position': 'top_left', 'logo_url': '',
        'primary_color': '#2a6286', 'accent_color': '#e67e22',
        'font_style': 'modern', 'show_footer': True,
        'itinerary_layout': 'vertical',
        'time_slots': {
            'morning': {'enabled': True, 'label': 'Morning'},
            'afternoon': {'enabled': True, 'label': 'Afternoon'},
            'evening': {'enabled': True, 'label': 'Evening'},
            'night': {'enabled': True, 'label': 'Night'},
            'full_day': {'enabled': True, 'label': 'Full Day'},
        },
        'content_visibility': {
            'show_inclusions': True, 'show_exclusions': True,
            'show_cancellation': True, 'show_activity_images': True,
        },
        'sections': [
            {'id': 'header', 'label': 'Header / Cover Block', 'visible': True},
            {'id': 'itinerary', 'label': 'Itinerary (Day-wise)', 'visible': True},
            {'id': 'inclusions', 'label': 'Inclusions', 'visible': True},
            {'id': 'exclusions', 'label': 'Exclusions', 'visible': True},
            {'id': 'pricing', 'label': 'Pricing Table', 'visible': True},
            {'id': 'cancellation', 'label': 'Cancellation Policy', 'visible': True},
            {'id': 'terms', 'label': 'Terms & Conditions', 'visible': True},
        ],
        'terms': {'show': True, 'use_global': True, 'custom_text': ''},
        'extra_sections': [
            { 'id': 'intl-1', 'heading': 'Visa Requirements',         'content': 'Visa on arrival or pre-travel visa processing is required as per destination country guidelines.', 'show': True },
            { 'id': 'intl-2', 'heading': 'Passport Validity',         'content': 'Passport must be valid for at least 6 months from the date of travel.', 'show': True },
            { 'id': 'intl-3', 'heading': 'Currency Exchange',         'content': 'We recommend carrying international credit cards and local currency cash.', 'show': True },
            { 'id': 'intl-4', 'heading': 'International Flight Info', 'content': 'International flights are not included unless explicitly mentioned in inclusions.', 'show': True },
            { 'id': 'intl-5', 'heading': 'Forex Guidelines',          'content': 'Please carry a loaded multi-currency Forex card for convenient payments.', 'show': False },
            { 'id': 'intl-6', 'heading': 'Travel Insurance',          'content': 'We strongly recommend purchasing comprehensive travel insurance.', 'show': False },
            { 'id': 'intl-7', 'heading': 'Embassy Contacts',          'content': 'Indian Embassy contact details will be shared upon booking confirmation.', 'show': False },
        ]
    }

    _IMAGE_CACHE = {}

    def download_image(url: str, timeout: float = 5.0) -> bytes | None:
        try:
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.read()
        except Exception:
            return None

    def _clean_str(val: str) -> str:
        return val.strip() if val else ""

    def _clean_color(val: str) -> str:
        return val.strip() if val else "#1a5276"

    def _hex_to_rgb(hex_color: str):
        h = hex_color.lstrip('#')
        if len(h) != 6:
            return (0.1, 0.32, 0.46)
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return (r / 255, g / 255, b / 255)

    def _migrate_pdf_customizer(s: dict) -> dict:
        return s

    def get_active_slots(time_slots: dict) -> list:
        order = ['morning', 'afternoon', 'evening', 'night', 'full_day', 'half_day']
        return [
            (k, time_slots.get(k, {}).get('label', k.capitalize()))
            for k in order if time_slots.get(k, {}).get('enabled', True)
        ]

    def extract_package_inclusions_exclusions(pkg) -> tuple[list[str], list[str]]:
        inc = json.loads(pkg.included_items) if isinstance(pkg.included_items, str) else (pkg.included_items or [])
        exc = json.loads(pkg.excluded_items) if isinstance(pkg.excluded_items, str) else (pkg.excluded_items or [])
        return inc, exc

logger = logging.getLogger(__name__)


def _is_international_destination(dest: str) -> bool:
    dest = dest.lower().strip()
    if not dest:
        return False
    indian_keywords = [
        "india", "kerala", "kochi", "munnar", "alleppey", "karnataka", "bengaluru", "coorg",
        "tamil nadu", "chennai", "ooty", "goa", "delhi", "mumbai", "rajasthan", "jaipur",
        "udaipur", "jaisalmer", "agra", "taj mahal", "himachal", "manali", "shimla",
        "kashmir", "srinagar", "ladakh", "leh", "sikkim", "gangtok", "darjeeling",
        "andaman", "port blair", "havelock", "gujarat"
    ]
    if any(k in dest for k in indian_keywords):
        return False
    return True


class PDFService:
    @staticmethod
    async def generate_quote_pdf(
        enquiry: Enquiry,
        packages: List[Package],
        agent_profile: Agent,
        quoted_data: List[Dict[str, Any]]
    ) -> str:
        """
        Generate a professional travel quotation PDF using ReportLab with smart alignments.
        If premium card-based layout fails due to size limitations, gracefully falls back to a linear flowable layout.
        """
        import asyncio

        # 1. Resolve Settings Group & Travel Type
        settings_group = _migrate_pdf_customizer(agent_profile.homepage_settings or {})
        pdf_customizer = settings_group.get('pdf_customizer', {})

        travel_type = "domestic"
        for pkg in packages:
            country = getattr(pkg, 'country', None)
            if country and country.strip().lower() not in ('india', 'in'):
                travel_type = "international"
                break
            dest = getattr(pkg, 'destination', '') or ''
            if _is_international_destination(dest):
                travel_type = "international"
                break

        s = pdf_customizer.get(travel_type, {})
        if not s:
            s = DEFAULT_DOMESTIC_SETTINGS if travel_type == 'domestic' else DEFAULT_INTERNATIONAL_SETTINGS

        # Resolve email safely before running in executor
        agent_email = getattr(agent_profile, 'smtp_from_email', None)
        if not agent_email:
            try:
                if agent_profile.user:
                    agent_email = agent_profile.user.email
            except Exception:
                pass
        if not agent_email:
            agent_email = getattr(agent_profile, 'email', None) or "info@agency.com"

        agent_details = {
            'agency_name': agent_profile.agency_name or "Your Agency",
            'email': agent_email,
            'phone': agent_profile.phone or ""
        }

        # 2. Concurrently pre-fetch ALL images before the ReportLab executor starts.
        #    Activity images + agent logo are collected, deduplicated, filtered against
        #    the LRU cache, then fired in parallel.  The executor thread makes zero
        #    network calls because everything lands in _IMAGE_CACHE first.

        # Configurable parallelism via env var (see .env.example)
        _PREFETCH_CONCURRENCY = int(os.getenv("PDF_IMAGE_PREFETCH_CONCURRENCY", "10"))

        show_activity_images = s.get('content_visibility', {}).get('show_activity_images', True)

        # --- Collect all candidate URLs ---
        raw_urls: set[str] = set()

        # Activity images from all packages
        if show_activity_images:
            for pkg in packages:
                for item in pkg.itinerary_items:
                    url = item.image_url
                    if url:
                        try:
                            if url.startswith(('"', "'", '[')):
                                import json as _json
                                parsed = _json.loads(url)
                                if isinstance(parsed, list) and parsed:
                                    url = parsed[0]
                                elif isinstance(parsed, str):
                                    url = parsed
                        except Exception:
                            pass
                        if url and url.startswith(('http://', 'https://')):
                            raw_urls.add(url)

        # Agent logo (also fetched synchronously during header render otherwise)
        logo_url = s.get('logo_url', '')
        if logo_url and logo_url.startswith(('http://', 'https://')):
            raw_urls.add(logo_url)

        # --- Deduplicate: skip URLs already in cache and not expired ---
        urls_to_fetch = [
            u for u in raw_urls
            if _cache_get(u) is None  # miss or expired
        ]

        # --- Log cache stats before fetch ---
        cache_stats = get_image_cache_stats()
        quote_ref = f"QUO-{enquiry.id.hex[:6].upper()}"
        logger.info(
            "PDF image prefetch starting | quote=%s | total_unique=%d | to_fetch=%d | "
            "cache_entries=%d/%d | cache_mb=%.2f",
            quote_ref, len(raw_urls), len(urls_to_fetch),
            cache_stats["entries"], cache_stats["max_entries"], cache_stats["estimated_mb"]
        )

        # --- Fire concurrent downloads ---
        if urls_to_fetch:
            try:
                import httpx
                import time as _time

                failed_urls: list[str] = []
                fetched_ok = 0
                _t0 = _time.monotonic()

                async def _fetch_one(client: httpx.AsyncClient, sem: asyncio.Semaphore, url: str):
                    nonlocal fetched_ok
                    async with sem:
                        try:
                            r = await client.get(url, timeout=6.0, follow_redirects=True)
                            if r.status_code == 200:
                                _cache_put(url, r.content)
                                fetched_ok += 1
                            else:
                                failed_urls.append(url)
                        except Exception:
                            failed_urls.append(url)

                sem = asyncio.Semaphore(_PREFETCH_CONCURRENCY)
                async with httpx.AsyncClient(
                    headers={'User-Agent': 'Mozilla/5.0'},
                    limits=httpx.Limits(max_connections=_PREFETCH_CONCURRENCY)
                ) as client:
                    await asyncio.gather(*[_fetch_one(client, sem, u) for u in urls_to_fetch])

                duration = round(_time.monotonic() - _t0, 2)
                logger.info(
                    "PDF image prefetch complete | quote=%s | total_urls=%d | "
                    "fetched_ok=%d | failed=%d | duration_seconds=%.2f",
                    quote_ref, len(urls_to_fetch), fetched_ok, len(failed_urls), duration
                )
                if failed_urls:
                    logger.warning(
                        "PDF prefetch failed URLs | quote=%s | failed_urls=%s",
                        quote_ref, failed_urls
                    )

            except ImportError:
                logger.warning("httpx not available — images will be fetched serially during render")
            except Exception as e:
                logger.warning("Image prefetch error (non-fatal): %s", e)

        # 3. Build PDF in an executor to avoid blocking the async event loop
        pdf_filename = f"quote_{enquiry.id.hex[:8]}_{uuid.uuid4().hex[:6]}.pdf"
        static_dir = os.path.join(os.path.dirname(__file__), "..", "..", "static", "quotes")
        os.makedirs(static_dir, exist_ok=True)
        file_path = os.path.join(static_dir, pdf_filename)

        loop = asyncio.get_event_loop()
        pdf_bytes = await loop.run_in_executor(
            None,
            PDFService._build_pdf_bytes,
            enquiry,
            packages,
            agent_details,
            quoted_data,
            s,
            travel_type
        )

        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        return f"/static/quotes/{pdf_filename}"

    @staticmethod
    def _build_pdf_bytes(
        enquiry: Enquiry,
        packages: List[Package],
        agent_profile: dict,
        quoted_data: List[Dict[str, Any]],
        s: dict,
        travel_type: str
    ) -> bytes:
        try:
            return PDFService._build_pdf_impl(enquiry, packages, agent_profile, quoted_data, s, travel_type, fallback_mode=False)
        except Exception as e:
            logger.warning("Premium Quote PDF build failed. Rebuilding in fallback mode: %s", e)
            try:
                return PDFService._build_pdf_impl(enquiry, packages, agent_profile, quoted_data, s, travel_type, fallback_mode=True)
            except Exception as fallback_err:
                logger.error("Fallback Quote PDF build also failed: %s", fallback_err, exc_info=True)
                raise fallback_err

    @staticmethod
    def _build_pdf_impl(
        enquiry: Optional[Enquiry],
        packages: List[Package],
        agent_profile: dict,
        quoted_data: Optional[List[Dict[str, Any]]],
        s: dict,
        travel_type: str,
        fallback_mode: bool = False
    ) -> bytes:
        if not s:
            s = DEFAULT_DOMESTIC_SETTINGS if travel_type == 'domestic' else DEFAULT_INTERNATIONAL_SETTINGS
            
        buf = io.BytesIO()
        doc_title = f"Quotation - {enquiry.customer_name}" if enquiry else f"Itinerary - {packages[0].title if packages else 'Package'}"
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            rightMargin=2.0 * cm,
            leftMargin=2.0 * cm,
            topMargin=2.0 * cm,
            bottomMargin=2.5 * cm,
            title=doc_title,
        )

        printable_width = A4[0] - (doc.leftMargin + doc.rightMargin)
        agency_name = agent_profile.get('agency_name') or "Your Agency"

        primary_rgb = _hex_to_rgb(_clean_color(s.get('primary_color', '#1a5276')))
        accent_rgb = _hex_to_rgb(_clean_color(s.get('accent_color', '#f39c12')))
        primary_rl = colors.Color(*primary_rgb)
        accent_rl = colors.Color(*accent_rgb)

        base_font = FONT_MAP.get(s.get('font_style', 'default'), 'Helvetica') if 'FONT_MAP' in globals() else 'Helvetica'
        if base_font not in ('Helvetica', 'Times-Roman', 'Courier'):
            base_font = 'Helvetica'
        bold_font = base_font + '-Bold' if base_font == 'Times-Roman' else 'Helvetica-Bold'

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'PdfTitle',
            fontName=bold_font,
            fontSize=20,
            textColor=primary_rl,
            spaceAfter=4,
            leading=24,
        )
        heading_style = ParagraphStyle(
            'PdfHeading',
            fontName=bold_font,
            fontSize=14,
            textColor=primary_rl,
            spaceBefore=12,
            spaceAfter=6,
            leading=18,
            keepWithNext=True,
        )
        body_style = ParagraphStyle(
            'PdfBody',
            fontName=base_font,
            fontSize=11,
            textColor=colors.HexColor('#222222'),
            spaceAfter=3,
            leading=16,
        )
        desc_style = ParagraphStyle(
            'PdfDesc',
            fontName=base_font,
            fontSize=11,
            textColor=colors.HexColor('#222222'),
            spaceAfter=4,
            leading=16,
            alignment=TA_JUSTIFY,
        )
        small_style = ParagraphStyle(
            'PdfSmall',
            fontName=base_font,
            fontSize=9,
            textColor=colors.HexColor('#555555'),
            spaceAfter=2,
            leading=12,
        )

        time_slots = s.get('time_slots', {})
        active_slots = get_active_slots(time_slots)

        story = []

        def wrap_keep_together(flowables):
            if fallback_mode or not flowables:
                return flowables
            try:
                kt = KeepTogether(flowables)
                w, h = kt.wrap(printable_width, doc.pagesize[1] - doc.topMargin - doc.bottomMargin)
                max_height = doc.pagesize[1] - doc.topMargin - doc.bottomMargin
                if h > max_height:
                    return flowables
                return [kt]
            except Exception:
                try:
                    return [KeepTogether(flowables)]
                except Exception:
                    return flowables

        def get_logo_flowable(url: str, max_w: float, max_h: float):
            from reportlab.platypus import Image as RLImage
            if not url or not url.startswith(('http://', 'https://')):
                return None
            try:
                img_data = _cache_get(url)
                if img_data is None:
                    img_data = download_image(url)
                    if img_data:
                        _cache_put(url, img_data)
                if img_data:
                    img = PILImage.open(io.BytesIO(img_data))
                    w, h = img.size
                    aspect = w / h
                    if w > max_w:
                        w = max_w
                        h = w / aspect
                    if h > max_h:
                        h = max_h
                        w = h * aspect
                    return RLImage(io.BytesIO(img_data), width=w, height=h)
            except Exception as e:
                logger.warning("Error creating Logo RLImage flowable for %s: %s", url, e)
            return None

        raw_sections = s.get('sections', [])
        visible_section_ids = [sec['id'] for sec in raw_sections if sec.get('visible', True)]

        price_map = {str(item['packageId']): item['quotedPrice'] for item in quoted_data} if quoted_data else {}

        def _add_section(section_id: str):
            if section_id == 'header':
                sec_story = []
                logo_pos = s.get('logo_position', 'top_left')
                logo_url = s.get('logo_url')

                logo_flow = None
                if logo_url:
                    logo_flow = get_logo_flowable(logo_url, 120, 60)

                agency_name_p = Paragraph(_clean_str(agency_name), ParagraphStyle(
                    'AgencyName', fontName=bold_font, fontSize=20, textColor=primary_rl, leading=24
                ))

                quote_title_p = Paragraph('Travel Quotation & Itinerary', ParagraphStyle(
                    'QuoteTitle', fontName=base_font, fontSize=12, textColor=colors.HexColor('#555555'), leading=16
                ))

                if logo_flow:
                    if logo_pos == 'top_left':
                        hdr_table = Table([[logo_flow, [agency_name_p, quote_title_p]]], colWidths=[130, printable_width - 130])
                        hdr_table.setStyle(TableStyle([
                            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                            ('LEFTPADDING', (0,0), (-1,-1), 0),
                            ('RIGHTPADDING', (0,0), (-1,-1), 0),
                            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                            ('TOPPADDING', (0,0), (-1,-1), 0),
                        ]))
                        sec_story.append(hdr_table)
                    elif logo_pos == 'top_right':
                        hdr_table = Table([[[agency_name_p, quote_title_p], logo_flow]], colWidths=[printable_width - 130, 130])
                        hdr_table.setStyle(TableStyle([
                            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                            ('ALIGN', (1,0), (1,0), 'RIGHT'),
                            ('LEFTPADDING', (0,0), (-1,-1), 0),
                            ('RIGHTPADDING', (0,0), (-1,-1), 0),
                            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                            ('TOPPADDING', (0,0), (-1,-1), 0),
                        ]))
                        sec_story.append(hdr_table)
                    else:
                        logo_flow.hAlign = 'CENTER'
                        agency_name_p.style.alignment = TA_CENTER
                        quote_title_p.style.alignment = TA_CENTER
                        sec_story.append(logo_flow)
                        sec_story.append(Spacer(1, 0.15 * cm))
                        sec_story.append(agency_name_p)
                        sec_story.append(quote_title_p)
                else:
                    align = TA_LEFT if logo_pos == 'top_left' else (TA_CENTER if logo_pos == 'top_center' else TA_RIGHT)
                    agency_name_p.style.alignment = align
                    quote_title_p.style.alignment = align
                    sec_story.append(agency_name_p)
                    sec_story.append(quote_title_p)

                sec_story.append(Spacer(1, 0.2 * cm))
                sec_story.append(HRFlowable(width='100%', thickness=2, color=primary_rl))
                sec_story.append(Spacer(1, 0.3 * cm))
                story.extend(wrap_keep_together(sec_story))

            elif section_id == 'terms':
                extra_sections = s.get('extra_sections', [])
                if not isinstance(extra_sections, list):
                    extra_sections = []
                
                notes_story = []
                title_label = 'Domestic Travel Information' if travel_type == 'domestic' else 'International Travel Information'
                notes_story.append(Paragraph(title_label, heading_style))
                notes_story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
                notes_story.append(Spacer(1, 0.15 * cm))
                
                notes_list = []
                for item in extra_sections:
                    if isinstance(item, dict) and item.get('show', True) and item.get('content'):
                        notes_list.append((item.get('heading', ''), item.get('content', '')))
                
                for title, desc in notes_list:
                    notes_story.append(Paragraph(f"<b>{title}:</b> {desc}", small_style))
                    
                if notes_list:
                    notes_story.append(Spacer(1, 0.2 * cm))
                    story.extend(wrap_keep_together(notes_story))

                terms = s.get('terms', {})
                if terms.get('show', True):
                    terms_story = []
                    terms_story.append(Paragraph('Terms & Conditions', heading_style))
                    terms_story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
                    terms_story.append(Spacer(1, 0.15 * cm))
                    if terms.get('use_global', True):
                        terms_story.append(Paragraph('Standard terms and conditions apply. Please contact your travel advisor for the full T&C document.', small_style))
                    else:
                        custom = _clean_str(terms.get('custom_text', ''))
                        terms_story.append(Paragraph(custom or '(No custom T&C text provided)', small_style))
                    terms_story.append(Spacer(1, 0.2 * cm))
                    story.extend(wrap_keep_together(terms_story))

            elif section_id == 'footer':
                pass

        def format_inr(amount):
            return f"INR\u00A0{float(amount):,.2f}"

        if 'header' in visible_section_ids:
            _add_section('header')

            cover_story = []

            if enquiry:
                quote_ref_str = f"QUO-{enquiry.id.hex[:6].upper()}"
                travel_date_str = (
                    enquiry.travel_date.strftime('%d %b %Y')
                    if getattr(enquiry, 'travel_date', None) else 'TBD'
                )
                guests_str = str(getattr(enquiry, 'travellers', 1))
                valid_until_str = 'On Request'

                info_label_style = ParagraphStyle(
                    'CvrLbl', fontName=bold_font, fontSize=8,
                    textColor=colors.HexColor('#888888'), leading=11
                )
                info_val_style = ParagraphStyle(
                    'CvrVal', fontName=bold_font, fontSize=11,
                    textColor=primary_rl, leading=14
                )
                col_w = printable_width / 4
                info_row = [
                    [Paragraph('Quote Reference', info_label_style),
                     Paragraph('Travel Date', info_label_style),
                     Paragraph('Guests', info_label_style),
                     Paragraph('Valid Until', info_label_style)],
                    [Paragraph(quote_ref_str, info_val_style),
                     Paragraph(travel_date_str, info_val_style),
                     Paragraph(guests_str, info_val_style),
                     Paragraph(valid_until_str, info_val_style)],
                ]
                info_table = Table(info_row, colWidths=[col_w] * 4)
                info_table.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 4),
                    ('TOPPADDING', (0,0), (-1,-1), 0),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ]))
                cover_story.append(info_table)
                cover_story.append(Spacer(1, 0.2 * cm))

            cover_story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#dddddd')))
            cover_story.append(Spacer(1, 0.3 * cm))

            summary_label = ParagraphStyle('SumLbl', fontName=bold_font, fontSize=12, textColor=primary_rl, spaceAfter=8)
            cover_story.append(Paragraph('Itinerary Summary', summary_label))

            for p in packages:
                dur_str = f"{p.duration_days} Days / {p.duration_nights} Nights"
                dest_str = _clean_str(p.destination)
                line_text = f"<b>{_clean_str(p.title)}</b> <font color='#888888'>({dur_str} • {dest_str})</font>"
                cover_story.append(Paragraph(f"• {line_text}", body_style))

            if enquiry and quoted_data:
                cover_story.append(Spacer(1, 0.4 * cm))
                grand_total = 0.0
                for pkg in packages:
                    qp = float(price_map.get(str(pkg.id), pkg.price_per_person))
                    subtotal = qp * enquiry.travellers
                    grand_total += subtotal
                
                total_str = f"Total Quotation Value: {format_inr(grand_total)}"
                cover_story.append(Paragraph(f"<b>{total_str}</b>", ParagraphStyle('CvrTotal', fontName=bold_font, fontSize=12, textColor=primary_rl)))

            cover_story.append(Spacer(1, 1.0 * cm))
            story.extend(cover_story)

        if enquiry and 'customer_details' in visible_section_ids:
            story.append(Spacer(1, 1 * cm))
            story.append(Paragraph('Prepared For', heading_style))
            story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
            story.append(Spacer(1, 0.2 * cm))

            cust_name = _clean_str(getattr(enquiry, 'customer_name', '') or '')
            cust_email = getattr(enquiry, 'email', '')
            cust_phone = getattr(enquiry, 'phone', '')
            
            data = [
                ['Name', cust_name],
                ['Email', cust_email],
                ['Phone', cust_phone],
            ]
            
            t = Table(data, colWidths=[printable_width * 0.25, printable_width * 0.75])
            t.setStyle(TableStyle([
                ('FONTNAME', (0,0), (0,-1), bold_font),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(t)
            story.append(Spacer(1, 0.5 * cm))

        for pkg_idx, pkg in enumerate(packages):
            if 'itinerary' in visible_section_ids:
                pkg_header = []
                pkg_header.append(Paragraph(f'{pkg.title}', heading_style))
                pkg_header.append(Paragraph(
                    f'<b>Duration:</b> {pkg.duration_days} Days / {pkg.duration_nights} Nights'
                    f' | <b>Destination:</b> {pkg.destination}',
                    small_style
                ))
                pkg_header.append(HRFlowable(width='100%', thickness=1.5, color=accent_rl))
                pkg_header.append(Spacer(1, 8))

                days_info = []
                for item in pkg.itinerary_items:
                    acts = []
                    if item.activities:
                        try:
                            parsed = json.loads(item.activities) if isinstance(item.activities, str) else item.activities
                            if isinstance(parsed, list):
                                acts = [str(x) for x in parsed if x]
                        except Exception:
                            pass
                    img_url = item.image_url
                    if img_url:
                        try:
                            if img_url.startswith(('"', "'", '[')):
                                parsed = json.loads(img_url)
                                if isinstance(parsed, list):
                                    img_url = parsed[0] if len(parsed) > 0 else None
                                elif isinstance(parsed, str):
                                    img_url = parsed
                        except Exception:
                            pass
                    days_info.append({
                        'day_number': item.day_number,
                        'title': item.title,
                        'description': item.description,
                        'image_url': img_url,
                        'time_slot': item.time_slot,
                        'activities': acts,
                        'destination': pkg.destination
                    })

                grouped_days = defaultdict(list)
                for d in days_info:
                    grouped_days[d['day_number']].append(d)

                sorted_day_nums = sorted(grouped_days.keys())
                layout = s.get('itinerary_layout', 'vertical')
                if fallback_mode:
                    layout = 'vertical'

                if layout == 'horizontal':
                    from app.api.v1.agent_settings import build_itinerary_horizontal
                    pkg_itinerary = build_itinerary_horizontal(
                        sorted_day_nums, grouped_days, printable_width, s,
                        primary_rl, bold_font, base_font, active_slots, desc_style, body_style
                    )
                else:
                    from app.api.v1.agent_settings import build_itinerary_vertical
                    pkg_itinerary = build_itinerary_vertical(
                        sorted_day_nums, grouped_days, printable_width, s,
                        primary_rl, bold_font, base_font, active_slots, desc_style, body_style, fallback_mode
                    )

                if pkg_idx > 0:
                    story.append(PageBreak())

                if pkg_itinerary:
                    first_day = pkg_itinerary[0]
                    rest_days = pkg_itinerary[1:]
                    try:
                        story.append(KeepTogether(pkg_header + [first_day]))
                    except Exception:
                        story.extend(pkg_header)
                        story.append(first_day)
                    story.extend(rest_days)
                else:
                    story.extend(pkg_header)

                story.append(Spacer(1, 0.5 * cm))

            if 'inclusions' in visible_section_ids and s.get('content_visibility', {}).get('show_inclusions', True):
                inc_list, _ = extract_package_inclusions_exclusions(pkg)
                if inc_list:
                    inc_story = []
                    inc_story.append(Paragraph('Inclusions', heading_style))
                    inc_story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
                    inc_story.append(Spacer(1, 0.15 * cm))
                    for item in inc_list:
                        inc_story.append(Paragraph(f'✔ {_clean_str(item)}', body_style))
                    inc_story.append(Spacer(1, 0.2 * cm))
                    story.extend(wrap_keep_together(inc_story))

            if 'exclusions' in visible_section_ids and s.get('content_visibility', {}).get('show_exclusions', True):
                _, exc_list = extract_package_inclusions_exclusions(pkg)
                if exc_list:
                    exc_story = []
                    exc_story.append(Paragraph('Exclusions', heading_style))
                    exc_story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
                    exc_story.append(Spacer(1, 0.15 * cm))
                    for item in exc_list:
                        exc_story.append(Paragraph(f'✘ {_clean_str(item)}', body_style))
                    exc_story.append(Spacer(1, 0.2 * cm))
                    story.extend(wrap_keep_together(exc_story))

            if 'cancellation' in visible_section_ids and s.get('content_visibility', {}).get('show_cancellation', True):
                raw_rules = getattr(pkg, 'cancellation_rules', None)
                cancel_story = []
                cancel_story.append(Paragraph('Cancellation Policy', heading_style))
                cancel_story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
                cancel_story.append(Spacer(1, 0.15 * cm))

                tier_data = [['Days Before Departure', 'Refund %', 'Cancellation Charge']]

                if raw_rules:
                    if isinstance(raw_rules, str):
                        try:
                            raw_rules = json.loads(raw_rules)
                        except Exception:
                            raw_rules = []

                    if isinstance(raw_rules, list):
                        for r in raw_rules:
                            if isinstance(r, dict):
                                days_val   = r.get('daysBefore')
                                refund_val = r.get('refundPercentage')
                                if days_val is not None and refund_val is not None:
                                    try:
                                        refund_pct = float(refund_val)
                                        charge_pct = 100.0 - refund_pct
                                        refund_str = (
                                            f"{int(refund_pct)}%"
                                            if refund_pct == int(refund_pct)
                                            else f"{refund_pct}%"
                                        )
                                        charge_str = (
                                            f"{int(charge_pct)}% charge"
                                            if charge_pct == int(charge_pct)
                                            else f"{charge_pct}% charge"
                                        )
                                    except Exception:
                                        refund_str = f"{refund_val}%"
                                        charge_str = "—"
                                    tier_data.append([
                                        f"{days_val} days",
                                        refund_str,
                                        charge_str,
                                    ])

                if len(tier_data) > 1:
                    tier_table = Table(
                        tier_data,
                        colWidths=[
                            printable_width * 0.38,
                            printable_width * 0.22,
                            printable_width * 0.40,
                        ]
                    )
                    tier_table.setStyle(TableStyle([
                        ('BACKGROUND',    (0, 0), (-1, 0),  accent_rl),
                        ('TEXTCOLOR',     (0, 0), (-1, 0),  colors.white),
                        ('FONTNAME',      (0, 0), (-1, 0),  bold_font),
                        ('FONTSIZE',      (0, 0), (-1, -1), 9),
                        ('GRID',          (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
                        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [colors.white, colors.HexColor('#fafafa')]),
                        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
                        ('ALIGN',         (1, 0), (2, -1),  'CENTER'),
                        ('TOPPADDING',    (0, 0), (-1, -1), 5),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
                        ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
                    ]))
                    cancel_story.append(tier_table)
                else:
                    cancel_story.append(Paragraph(
                        'Cancellation are Not applied in this package.',
                        body_style
                    ))

                cancel_story.append(Spacer(1, 0.2 * cm))
                story.extend(wrap_keep_together(cancel_story))

            if 'pricing' in visible_section_ids and enquiry and quoted_data:
                pricing_story = []
                pricing_story.append(Paragraph('Package Pricing', heading_style))
                pricing_story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
                pricing_story.append(Spacer(1, 0.15 * cm))
                quoted_price = float(price_map.get(str(pkg.id), pkg.price_per_person))
                subtotal = quoted_price * enquiry.travellers
                
                price_data = [['Description', 'Qty', 'Rate / Pax', 'Subtotal']]
                pkg_p = Paragraph(_clean_str(pkg.title), body_style)
                price_data.append([pkg_p, str(enquiry.travellers), format_inr(quoted_price), format_inr(subtotal)])
                
                price_table = Table(price_data, colWidths=[printable_width * 0.55, printable_width * 0.10, printable_width * 0.175, printable_width * 0.175])
                price_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), primary_rl),
                    ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
                    ('FONTNAME',   (0, 0), (-1, 0), bold_font),
                    ('FONTSIZE',   (0, 0), (-1, -1), 10),
                    ('GRID',       (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
                    ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f5f5f5')),
                    ('FONTNAME',   (0, -1), (-1, -1), bold_font),
                    ('ALIGN',      (1, 0), (-1, -1), 'RIGHT'),
                    ('ALIGN',      (0, 0), (0, -1), 'LEFT'),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#fafafa')]),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('TOPPADDING', (0,0), (-1,-1), 6),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ]))
                pricing_story.append(price_table)
                pricing_story.append(Spacer(1, 0.3 * cm))
                story.extend(wrap_keep_together(pricing_story))

        if 'pricing' in visible_section_ids and len(packages) > 0 and enquiry and quoted_data:
            story.append(CondPageBreak(200))
            grand_story = []
            grand_story.append(Paragraph('Grand Total Summary', heading_style))
            grand_story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
            grand_story.append(Spacer(1, 0.15 * cm))
            
            summary_data = [['Description', 'Qty', 'Rate / Pax', 'Subtotal']]
            grand_total = 0.0
            for pkg in packages:
                quoted_price = float(price_map.get(str(pkg.id), pkg.price_per_person))
                subtotal = quoted_price * enquiry.travellers
                grand_total += subtotal
                pkg_p = Paragraph(_clean_str(pkg.title), body_style)
                summary_data.append([pkg_p, str(enquiry.travellers), format_inr(quoted_price), format_inr(subtotal)])
                
            total_p = Paragraph('<b>Total Quotation Value</b>', body_style)
            summary_data.append([total_p, '', '', format_inr(grand_total)])
            
            summary_table = Table(summary_data, colWidths=[printable_width * 0.55, printable_width * 0.10, printable_width * 0.175, printable_width * 0.175])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), primary_rl),
                ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
                ('FONTNAME',   (0, 0), (-1, 0), bold_font),
                ('FONTSIZE',   (0, 0), (-1, -1), 10),
                ('GRID',       (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f5f5f5')),
                ('FONTNAME',   (0, -1), (-1, -1), bold_font),
                ('ALIGN',      (1, 0), (-1, -1), 'RIGHT'),
                ('ALIGN',      (0, 0), (0, -1), 'LEFT'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#fafafa')]),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ]))
            grand_story.append(summary_table)
            grand_story.append(Spacer(1, 0.3 * cm))
            story.extend(wrap_keep_together(grand_story))

        if 'terms' in visible_section_ids:
            _add_section('terms')
        if 'footer' in visible_section_ids:
            _add_section('footer')

        show_footer = s.get('show_footer', True)
        email_str = agent_profile.get('email') or "info@agency.com"
        phone_str = agent_profile.get('phone') or ""
        quote_ref = f"QUO-{enquiry.id.hex[:6].upper()}" if enquiry else "ITINERARY"

        canvas_maker = lambda *args, **kwargs: FooterCanvas(
            *args,
            agent_info={'agency_name': agency_name, 'email': email_str, 'phone': phone_str, 'quote_ref': quote_ref},
            show_footer=show_footer,
            primary_rl=primary_rl,
            base_font=base_font,
            **kwargs
        )

        try:
            doc.build(story, canvasmaker=canvas_maker)
        except Exception as e:
            logger.error("Error during doc.build: %s", e)
            raise

        return buf.getvalue()

    @staticmethod
    def generate_package_itinerary_pdf_bytes(
        package: Package,
        agent_profile: dict,
        s: dict,
        travel_type: str = 'family'
    ) -> bytes:
        """
        Generate the customized PDF format for a standalone package
        (i.e., without an Enquiry or Quoted pricing data).
        """
        try:
            return PDFService._build_pdf_impl(
                enquiry=None,
                packages=[package],
                agent_profile=agent_profile,
                quoted_data=None,
                s=s,
                travel_type=travel_type,
                fallback_mode=False
            )
        except Exception as e:
            logger.warning("Premium Itinerary PDF build failed. Rebuilding in fallback mode: %s", e)
            return PDFService._build_pdf_impl(
                enquiry=None,
                packages=[package],
                agent_profile=agent_profile,
                quoted_data=None,
                s=s,
                travel_type=travel_type,
                fallback_mode=True
            )


pdf_service = PDFService()
