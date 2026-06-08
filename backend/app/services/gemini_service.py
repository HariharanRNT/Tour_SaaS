"""
GeminiService — Unified facade for all Gemini AI sub-services.

This module preserves the original public API so that all existing callers
(ai_assistant.py, enquiries.py, etc.) continue to work without any changes.

Responsibilities are now split across focused modules:
  - gemini_base.py              → GeminiBase (API client, key rotation, retry)
  - chat_service.py             → ChatService (agent chat, customer package search chat)
  - package_generation_service.py → PackageGenerationService (generate & refine packages)
  - enquiry_analysis_service.py → EnquiryAnalysisService (extract enquiry parameters)
  - itinerary_import_service.py → ItineraryImportService (parse uploaded files, search filters)
  - package_search_tools.py     → PackageSearchTools (DB tool handlers for function calling)
"""
from app.services.gemini_base import GeminiBase
from app.services.chat_service import ChatService
from app.services.package_generation_service import PackageGenerationService
from app.services.enquiry_analysis_service import EnquiryAnalysisService
from app.services.itinerary_import_service import ItineraryImportService
from typing import Dict, List, Optional


class GeminiService(
    ChatService,
    PackageGenerationService,
    EnquiryAnalysisService,
    ItineraryImportService,
):
    """
    Unified GeminiService — composes all specialized sub-services via multiple inheritance.

    Public methods (unchanged from original):
      - chat(message, conversation_history)
      - chat_package_search(message, conversation_history, admin_id, session_state)
      - generate_package(conversation_summary)
      - refine_itinerary(current_itinerary, modification_request)
      - analyze_enquiry(message)
      - import_itinerary_from_text(extracted_text)
      - extract_search_filters(query)
    """
    pass


# Singleton — identical to the original. All callers import this directly.
gemini_service = GeminiService()
