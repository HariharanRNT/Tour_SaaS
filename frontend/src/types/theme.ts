export interface AgentTheme {
    id: string;
    agent_id: string;

    // Colors
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    foreground_color: string;
    heading_color?: string;
    body_text_color?: string;

    // Button & Card Styles
    button_bg_color?: string;
    button_text_color?: string;
    button_hover_bg_color?: string;
    button_radius: string;
    card_bg_color?: string;
    card_shadow?: string;
    card_radius: string;

    // Typography
    font_family: string;
    radius: string;

    // Content Customization
    home_hero_title?: string;
    home_hero_subtitle?: string;
    home_hero_image?: string;

    // Hero CTA
    hero_cta_primary_text?: string;
    hero_cta_secondary_text?: string;
    hero_background_type: string;
    hero_gradient?: string;

    // Complex sections
    feature_cards?: any[];
    wcu_cards?: any[];

    // Layout
    section_spacing: string;

    plan_trip_title?: string;
    plan_trip_subtitle?: string;
    plan_trip_image?: string;
    plan_trip_hero_overlay_opacity?: number;
    plan_trip_cta_text?: string;
    plan_trip_cta_color?: string;
    plan_trip_info_section_heading?: string;
    plan_trip_info_cards?: any[];
    wcu_title?: string;
    wcu_accent_title?: string;
    hero_overlay_opacity?: number;
    show_feature_cards?: boolean;
    show_wcu_section?: boolean;

    // Navbar Customization
    navbar_logo_text?: string;
    navbar_logo_text_color?: string;
    navbar_logo_font_weight?: string;
    navbar_logo_image?: string;
    navbar_logo_color?: string;
    navbar_links?: any[];
    navbar_links_color?: string;
    navbar_login_label?: string;
    navbar_login_show?: boolean;
    navbar_login_style?: string;
    navbar_signup_label?: string;
    navbar_signup_bg_color?: string;
    navbar_signup_text_color?: string;
    navbar_bg_color?: string;
    navbar_border_color?: string;
    navbar_sticky?: boolean;
    navbar_transparent_on_hero?: boolean;
    navbar_style_preset?: string;

    // Itinerary Page Customization
    itin_hero_image?: string;
    itin_hero_overlay_opacity?: number;
    itin_destination_accent_color?: string;
    itin_info_card_style?: 'dark' | 'light' | 'transparent' | 'tinted';
    itin_overview_icon_color?: string;
    itin_overview_card_style?: 'white' | 'tinted';
    itin_overview_card_border?: 'none' | 'subtle' | 'shadow';
    itin_heading_border_color?: string;
    itin_active_day_color?: string;
    itin_morning_color?: string;
    itin_afternoon_color?: string;
    itin_evening_color?: string;
    itin_night_color?: string;
    itin_day_badge_color?: string;
    itin_activity_layout?: 'compact' | 'expanded';
    itin_sidebar_bg?: 'navy' | 'brand' | 'white';
    itin_price_color?: string;
    itin_cta_text?: string;
    itin_cta_color?: string;
    itin_cta_text_color?: string;
    itin_show_trust_badges?: boolean;
    itin_ai_badge_color?: string;
    itin_tag_color?: string;
    itin_show_ai_badge?: boolean;
    itin_trust_title?: string;
    itin_trust_title_color?: string;
    itin_show_trust_section?: boolean;
    itin_trust_section_bg?: string;
    itin_trust_card_style?: 'flat' | 'bordered' | 'shadowed' | 'colored';
    itin_trust_cards?: any[];


    created_at: string;
    updated_at?: string;
}

export interface AgentThemeUpdate {
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    background_color?: string;
    foreground_color?: string;
    heading_color?: string;
    body_text_color?: string;

    button_bg_color?: string;
    button_text_color?: string;
    button_hover_bg_color?: string;
    button_radius?: string;
    card_bg_color?: string;
    card_shadow?: string;
    card_radius?: string;

    font_family?: string;
    radius?: string;

    home_hero_title?: string;
    home_hero_subtitle?: string;
    home_hero_image?: string;

    hero_cta_primary_text?: string;
    hero_cta_secondary_text?: string;
    hero_background_type?: string;
    hero_gradient?: string;

    feature_cards?: any[];
    wcu_cards?: any[];

    section_spacing?: string;

    plan_trip_title?: string;
    plan_trip_subtitle?: string;
    plan_trip_image?: string;
    plan_trip_hero_overlay_opacity?: number;
    plan_trip_cta_text?: string;
    plan_trip_cta_color?: string;
    plan_trip_info_section_heading?: string;
    plan_trip_info_cards?: any[];
    wcu_title?: string;
    wcu_accent_title?: string;
    hero_overlay_opacity?: number;
    show_feature_cards?: boolean;
    show_wcu_section?: boolean;

    // Navbar Customization
    navbar_logo_text?: string;
    navbar_logo_text_color?: string;
    navbar_logo_font_weight?: string;
    navbar_logo_image?: string;
    navbar_logo_color?: string;
    navbar_links?: any[];
    navbar_links_color?: string;
    navbar_login_label?: string;
    navbar_login_show?: boolean;
    navbar_login_style?: string;
    navbar_signup_label?: string;
    navbar_signup_bg_color?: string;
    navbar_signup_text_color?: string;
    navbar_bg_color?: string;
    navbar_border_color?: string;
    navbar_sticky?: boolean;
    navbar_transparent_on_hero?: boolean;
    navbar_style_preset?: string;

    // Itinerary Page Customization
    itin_hero_image?: string;
    itin_hero_overlay_opacity?: number;
    itin_destination_accent_color?: string;
    itin_info_card_style?: 'dark' | 'light' | 'transparent' | 'tinted';
    itin_overview_icon_color?: string;
    itin_overview_card_style?: 'white' | 'tinted';
    itin_overview_card_border?: 'none' | 'subtle' | 'shadow';
    itin_heading_border_color?: string;
    itin_active_day_color?: string;
    itin_morning_color?: string;
    itin_afternoon_color?: string;
    itin_evening_color?: string;
    itin_night_color?: string;
    itin_day_badge_color?: string;
    itin_activity_layout?: 'compact' | 'expanded';
    itin_sidebar_bg?: 'navy' | 'brand' | 'white';
    itin_price_color?: string;
    itin_cta_text?: string;
    itin_cta_color?: string;
    itin_cta_text_color?: string;
    itin_show_trust_badges?: boolean;
    itin_ai_badge_color?: string;
    itin_tag_color?: string;
    itin_show_ai_badge?: boolean;
    itin_trust_title?: string;
    itin_trust_title_color?: string;
    itin_show_trust_section?: boolean;
    itin_trust_section_bg?: string;
    itin_trust_card_style?: 'flat' | 'bordered' | 'shadowed' | 'colored';
    itin_trust_cards?: any[];
}

