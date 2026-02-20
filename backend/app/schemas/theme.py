from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime

class AgentThemeBase(BaseModel):
    # Colors
    primary_color: str = "hsl(221.2 83.2% 53.3%)"
    secondary_color: str = "hsl(210 40% 96.1%)"
    accent_color: str = "hsl(210 40% 96.1%)"
    background_color: str = "hsl(0 0% 100%)"
    foreground_color: str = "hsl(222.2 84% 4.9%)"
    heading_color: Optional[str] = None
    body_text_color: Optional[str] = None
    
    # Button & Card Styles
    button_bg_color: Optional[str] = None
    button_text_color: Optional[str] = None
    button_hover_bg_color: Optional[str] = None
    button_radius: str = "0.5rem"
    card_bg_color: Optional[str] = None
    card_shadow: Optional[str] = None
    card_radius: str = "0.75rem"
    
    # Typography
    font_family: str = "Inter"
    radius: str = "0.5rem"
    
    # Content
    home_hero_title: Optional[str] = None
    home_hero_subtitle: Optional[str] = None
    home_hero_image: Optional[str] = None
    
    # Hero CTA
    hero_cta_primary_text: Optional[str] = None
    hero_cta_secondary_text: Optional[str] = None
    hero_background_type: str = "image"
    hero_gradient: Optional[str] = None
    
    # Complex sections
    feature_cards: Optional[List[Dict[str, Any]]] = None
    wcu_cards: Optional[List[Dict[str, Any]]] = None
    
    # Layout
    section_spacing: str = "comfortable"
    
    # New customization fields
    wcu_title: Optional[str] = None
    wcu_accent_title: Optional[str] = None
    hero_overlay_opacity: float = 0.6
    show_feature_cards: bool = True
    show_wcu_section: bool = True
    
    plan_trip_title: Optional[str] = None
    plan_trip_subtitle: Optional[str] = None
    plan_trip_image: Optional[str] = None
    plan_trip_hero_overlay_opacity: float = 0.5
    plan_trip_cta_text: Optional[str] = None
    plan_trip_cta_color: Optional[str] = None
    plan_trip_info_section_heading: Optional[str] = None
    plan_trip_info_cards: Optional[List[Dict[str, Any]]] = None
    
    # Navbar Customization
    navbar_logo_text: Optional[str] = None
    navbar_logo_image: Optional[str] = None
    navbar_logo_color: Optional[str] = None
    navbar_links: Optional[List[Dict[str, Any]]] = None
    navbar_links_color: Optional[str] = None
    navbar_login_label: Optional[str] = None
    navbar_login_show: bool = True
    navbar_login_style: str = "text"
    navbar_signup_label: Optional[str] = None
    navbar_signup_bg_color: Optional[str] = None
    navbar_signup_text_color: Optional[str] = None
    navbar_bg_color: Optional[str] = None
    navbar_border_color: Optional[str] = None
    navbar_sticky: bool = True
    navbar_transparent_on_hero: bool = False
    navbar_style_preset: str = "light"
    
    # Itinerary Page Customization
    itin_hero_image: Optional[str] = None
    itin_hero_overlay_opacity: float = 1.0
    itin_destination_accent_color: Optional[str] = None
    itin_info_card_style: str = "transparent"
    itin_overview_icon_color: Optional[str] = None
    itin_overview_card_style: str = "white"
    itin_overview_card_border: str = "subtle"
    itin_heading_border_color: Optional[str] = None
    itin_active_day_color: Optional[str] = None
    itin_morning_color: Optional[str] = None
    itin_afternoon_color: Optional[str] = None
    itin_evening_color: Optional[str] = None
    itin_night_color: Optional[str] = None
    itin_day_badge_color: Optional[str] = None
    itin_activity_layout: str = "expanded"
    itin_sidebar_bg: str = "white"
    itin_price_color: Optional[str] = None
    itin_cta_text: Optional[str] = None
    itin_cta_color: Optional[str] = None
    itin_cta_text_color: Optional[str] = None
    itin_show_trust_badges: bool = True
    itin_ai_badge_color: Optional[str] = None
    itin_tag_color: Optional[str] = None
    itin_show_ai_badge: bool = True
    
    # Itinerary Trust Section
    itin_trust_title: Optional[str] = "Why book with RNT Tour?"
    itin_trust_title_color: Optional[str] = None
    itin_show_trust_section: bool = True
    itin_trust_section_bg: Optional[str] = None
    itin_trust_card_style: str = "flat"
    itin_trust_cards: Optional[List[Dict[str, Any]]] = None
    version_type: str = "live"
    

class AgentThemeCreate(AgentThemeBase):
    pass

class AgentThemeUpdate(BaseModel):
    # All fields optional for update
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    background_color: Optional[str] = None
    foreground_color: Optional[str] = None
    heading_color: Optional[str] = None
    body_text_color: Optional[str] = None
    
    button_bg_color: Optional[str] = None
    button_text_color: Optional[str] = None
    button_hover_bg_color: Optional[str] = None
    button_radius: Optional[str] = None
    card_bg_color: Optional[str] = None
    card_shadow: Optional[str] = None
    card_radius: Optional[str] = None
    
    font_family: Optional[str] = None
    radius: Optional[str] = None
    
    home_hero_title: Optional[str] = None
    home_hero_subtitle: Optional[str] = None
    home_hero_image: Optional[str] = None
    
    hero_cta_primary_text: Optional[str] = None
    hero_cta_secondary_text: Optional[str] = None
    hero_background_type: Optional[str] = None
    hero_gradient: Optional[str] = None
    
    feature_cards: Optional[List[Dict[str, Any]]] = None
    wcu_cards: Optional[List[Dict[str, Any]]] = None
    
    section_spacing: Optional[str] = None
    
    plan_trip_title: Optional[str] = None
    plan_trip_subtitle: Optional[str] = None
    plan_trip_image: Optional[str] = None
    plan_trip_hero_overlay_opacity: Optional[float] = None
    plan_trip_cta_text: Optional[str] = None
    plan_trip_cta_color: Optional[str] = None
    plan_trip_info_section_heading: Optional[str] = None
    plan_trip_info_cards: Optional[List[Dict[str, Any]]] = None

    # Navbar Customization
    navbar_logo_text: Optional[str] = None
    navbar_logo_image: Optional[str] = None
    navbar_logo_color: Optional[str] = None
    navbar_links: Optional[List[Dict[str, Any]]] = None
    navbar_links_color: Optional[str] = None
    navbar_login_label: Optional[str] = None
    navbar_login_show: Optional[bool] = None
    navbar_login_style: Optional[str] = None
    navbar_signup_label: Optional[str] = None
    navbar_signup_bg_color: Optional[str] = None
    navbar_signup_text_color: Optional[str] = None
    navbar_bg_color: Optional[str] = None
    navbar_border_color: Optional[str] = None
    navbar_sticky: Optional[bool] = None
    navbar_transparent_on_hero: Optional[bool] = None
    navbar_style_preset: Optional[str] = None
    
    # Itinerary Page Customization
    itin_hero_image: Optional[str] = None
    itin_hero_overlay_opacity: Optional[float] = None
    itin_destination_accent_color: Optional[str] = None
    itin_info_card_style: Optional[str] = None
    itin_overview_icon_color: Optional[str] = None
    itin_overview_card_style: Optional[str] = None
    itin_overview_card_border: Optional[str] = None
    itin_heading_border_color: Optional[str] = None
    itin_active_day_color: Optional[str] = None
    itin_morning_color: Optional[str] = None
    itin_afternoon_color: Optional[str] = None
    itin_evening_color: Optional[str] = None
    itin_night_color: Optional[str] = None
    itin_day_badge_color: Optional[str] = None
    itin_activity_layout: Optional[str] = None
    itin_sidebar_bg: Optional[str] = None
    itin_price_color: Optional[str] = None
    itin_cta_text: Optional[str] = None
    itin_cta_color: Optional[str] = None
    itin_cta_text_color: Optional[str] = None
    itin_show_trust_badges: Optional[bool] = None
    itin_ai_badge_color: Optional[str] = None
    itin_tag_color: Optional[str] = None
    itin_show_ai_badge: Optional[bool] = None
    
    # Itinerary Trust Section
    itin_trust_title: Optional[str] = None
    itin_trust_title_color: Optional[str] = None
    itin_show_trust_section: Optional[bool] = None
    itin_trust_section_bg: Optional[str] = None
    itin_trust_card_style: Optional[str] = None
    itin_trust_cards: Optional[List[Dict[str, Any]]] = None
    

    # New customization fields
    wcu_title: Optional[str] = None
    wcu_accent_title: Optional[str] = None
    hero_overlay_opacity: Optional[float] = None
    show_feature_cards: Optional[bool] = None
    show_wcu_section: Optional[bool] = None

class AgentThemeResponse(AgentThemeBase):
    id: UUID
    agent_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    version_type: str

    model_config = ConfigDict(from_attributes=True)
