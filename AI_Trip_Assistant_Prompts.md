# AI Trip Assistant Development Prompts
## Complete Prompt Collection for Building with Anthropic Claude

> **Project**: TourSaaS AI Trip Planner
> **Purpose**: Ready-to-use prompts for all AI features
> **API**: Anthropic Claude (Sonnet 4 or Opus 4)

---

## 📋 Table of Contents

1. [Core System Prompts](#core-system-prompts)
2. [Package Generation Prompts](#package-generation-prompts)
3. [Itinerary Creation Prompts](#itinerary-creation-prompts)
4. [Activity Suggestion Prompts](#activity-suggestion-prompts)
5. [Natural Language Editing Prompts](#natural-language-editing-prompts)
6. [Optimization Prompts](#optimization-prompts)
7. [Pricing Calculation Prompts](#pricing-calculation-prompts)
8. [Description & Content Prompts](#description--content-prompts)
9. [Validation & Quality Check Prompts](#validation--quality-check-prompts)
10. [Advanced Feature Prompts](#advanced-feature-prompts)

---

## 🎯 Core System Prompts

### Base System Prompt for All Travel AI Tasks

```
You are an expert travel agent and tour planner with 20+ years of experience creating customized travel packages. You have extensive knowledge of:

- Global destinations, attractions, and hidden gems
- Cultural sensitivities and local customs
- Realistic travel logistics and timing
- Accommodation options across all budgets
- Transportation networks and travel routes
- Seasonal considerations and weather patterns
- Budget management and cost estimation
- Activity duration and difficulty levels

Your responses are:
- Practical and realistic (consider travel time, fatigue, logistics)
- Culturally sensitive and respectful
- Budget-conscious while maximizing value
- Well-structured and easy to understand
- Based on real-world travel experiences

Always provide JSON responses when requested, with no markdown formatting or explanations outside the JSON structure.
```

---

## 📦 Package Generation Prompts

### Prompt 1: Basic Package Generation

```
You are creating a comprehensive tour package based on the following requirements:

**Destination**: {destination}, {country}
**Duration**: {days} days, {nights} nights
**Budget**: {budget} {currency} per person
**Travel Type**: {travelType}
**Group Size**: {groupSize} people
**Special Preferences**: {preferences}
**Travel Date**: {travelDate} (if provided)

Create a complete tour package that includes:

1. **Package Title**: Create an engaging, descriptive title that captures the essence of the trip (e.g., "Tokyo Cultural Odyssey - 7 Days of Tradition & Modernity")

2. **Package Overview**: Brief 2-3 sentence description highlighting what makes this package special

3. **Day-by-Day Itinerary**: For each day, create 3-5 activities distributed across time slots:
   - MORNING (6:00 AM - 12:00 PM)
   - AFTERNOON (12:00 PM - 5:00 PM)
   - EVENING (5:00 PM - 9:00 PM)
   - NIGHT (9:00 PM - 11:00 PM)
   
   For each activity include:
   - Specific activity title
   - Detailed description (3-4 sentences)
   - Exact location/venue name
   - Start and end time
   - Duration estimate
   - Whether it's included in package price
   - Estimated cost if not included

4. **Package Highlights**: 4-6 bullet points of key experiences

5. **Inclusions**: List everything included in the package price:
   - Accommodation details
   - Meals
   - Transportation
   - Activities/entrance fees
   - Guide services
   - Other services

6. **Exclusions**: Common items not included (flights, visa, travel insurance, etc.)

7. **Pricing Breakdown**: Base price per person with brief cost justification

8. **Category Tags**: 2-3 relevant categories from: Adventure, Cultural & Heritage, Beach & Relaxation, Luxury, Budget-Friendly, Nature & Wildlife, Food & Culinary, City Tours, Spiritual, Family-Friendly

9. **Best Time to Visit**: Mention if travel date is ideal or suggest better periods

10. **Important Notes**: Any visa requirements, health precautions, or special preparations

**CRITICAL REQUIREMENTS**:
- Activities must be logically sequenced (consider geographic proximity)
- Include realistic travel time between locations
- Balance activity intensity (mix of active and relaxed)
- Respect local opening hours and rest days
- Account for meal times
- Consider group size in activity selection
- Stay within budget constraints
- Include diverse experiences (culture, food, nature, etc.)

Return ONLY the following JSON structure with no additional text:

{
  "packageTitle": "string",
  "packageOverview": "string",
  "destination": "string",
  "country": "string",
  "duration": {
    "days": number,
    "nights": number
  },
  "pricePerPerson": number,
  "currency": "string",
  "category": ["string"],
  "maxGroupSize": number,
  "highlights": ["string"],
  "inclusions": ["string"],
  "exclusions": ["string"],
  "itinerary": [
    {
      "day": number,
      "title": "string (e.g., 'Cultural Immersion & Temple Tour')",
      "activities": [
        {
          "timeSlot": "MORNING|AFTERNOON|EVENING|NIGHT",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "title": "string",
          "description": "string",
          "location": "string (specific venue/area name)",
          "duration": "string (e.g., '2-3 hours')",
          "included": boolean,
          "estimatedCost": number,
          "category": "string",
          "difficultyLevel": "Easy|Moderate|Challenging"
        }
      ]
    }
  ],
  "bestTimeToVisit": "string",
  "importantNotes": ["string"]
}
```

---

### Prompt 2: Theme-Based Package Generation

```
Create a specialized tour package focused on {theme} for {destination}.

**Theme**: {theme} (e.g., "Culinary Adventure", "Photography Tour", "Spiritual Journey", "Adventure Sports", "Historical Deep Dive")
**Destination**: {destination}, {country}
**Duration**: {days} days
**Budget**: {budget} {currency}
**Expertise Level**: {level} (Beginner, Intermediate, Advanced)

Design a package that:
1. Deeply explores the chosen theme with authentic experiences
2. Includes expert guides specialized in this theme
3. Provides hands-on/immersive activities related to the theme
4. Visits off-the-beaten-path locations relevant to the theme
5. Includes educational components (workshops, classes, demonstrations)
6. Balances themed activities with essential sightseeing

For a **Culinary Theme**, include:
- Cooking classes with local chefs
- Market tours with ingredient sourcing
- Traditional restaurant experiences
- Street food tours
- Farm/producer visits
- Regional specialties tasting

For a **Photography Theme**, include:
- Golden hour shoots at iconic locations
- Photo walks through local neighborhoods
- Workshops with local photographers
- Access to restricted/special photography spots
- Portrait sessions with local people
- Landscape/architecture focus times

[Adapt based on theme]

Return the standard package JSON structure with theme-specific activities emphasized.
```

---

### Prompt 3: Multi-Destination Package

```
Create a multi-destination tour package covering {destinations}.

**Destinations**: {destination1}, {destination2}, {destination3}
**Total Duration**: {totalDays} days
**Budget**: {budget} {currency} per person
**Transportation Mode**: {mode} (flights, train, road trip, cruise)

Requirements:
1. Optimal routing between destinations (minimize backtracking)
2. Realistic travel days with buffer time
3. Balanced time allocation per destination
4. Smooth transitions between locations
5. Consider transportation logistics and costs
6. Account for time zone changes if applicable

Structure:
- Days 1-X: Destination 1
- Day X: Travel day to Destination 2
- Days X-Y: Destination 2
- Day Y: Travel day to Destination 3
- Days Y-Z: Destination 3

For each destination, create complete daily itineraries.
Include inter-destination travel as separate itinerary items with:
- Departure location and time
- Transportation mode and details
- Arrival location and time
- Cost estimation

Return standard package JSON with multi-destination structure.
```

---

## 🗓️ Itinerary Creation Prompts

### Prompt 4: Single Day Itinerary

```
Create a detailed single-day itinerary for {destination}.

**Context**:
- Destination: {destination}
- Day number: {dayNumber} of {totalDays}
- Date: {date}
- Theme/Focus: {theme}
- Group size: {groupSize}
- Mobility level: {mobilityLevel}
- Previous day activities: {previousDayActivities}
- Next day plan: {nextDayPlan}

Create 3-5 activities that:
1. Flow logically throughout the day
2. Are geographically clustered to minimize travel time
3. Balance activity levels (avoid all high-energy activities)
4. Include meal breaks at appropriate times
5. Consider attraction opening hours
6. Account for weather if relevant
7. Build upon or complement previous days' experiences
8. Allow for flexibility and spontaneity

Time Distribution:
- MORNING: 1-2 activities (start after breakfast, 8:00-12:00)
- AFTERNOON: 1-2 activities (after lunch, 13:00-17:00)
- EVENING: 1 activity (dinner and evening activity, 18:00-21:00)
- NIGHT: Optional (for nightlife/special events)

Return JSON:
{
  "day": number,
  "title": "string",
  "theme": "string",
  "overview": "string (what makes this day special)",
  "activities": [
    {
      "timeSlot": "string",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "title": "string",
      "description": "string",
      "location": "string",
      "coordinates": {
        "lat": number,
        "lng": number
      },
      "duration": "string",
      "included": boolean,
      "estimatedCost": number,
      "category": "string",
      "bookingRequired": boolean,
      "alternativeIfClosed": "string"
    }
  ],
  "estimatedTravelTime": "string (total time moving between locations)",
  "estimatedWalkingDistance": "string",
  "tips": ["string"],
  "packingList": ["string (specific items needed this day)"]
}
```

---

### Prompt 5: Rainy Day / Bad Weather Alternative

```
The original itinerary for Day {dayNumber} in {destination} is affected by bad weather ({weatherCondition}).

**Original Plan**:
{originalItinerary}

**Weather Forecast**: {weatherDescription}
**Available Time**: {timeSlot}

Create an alternative itinerary that:
1. Replaces outdoor activities with indoor alternatives
2. Maintains the spirit and theme of original activities
3. Uses the same time slots
4. Stays within the same budget
5. Requires minimal additional planning
6. Still provides great experiences

Suggest:
- Indoor museums, galleries, or cultural centers
- Covered markets or shopping areas
- Cooking classes or workshops
- Spa/wellness activities
- Indoor entertainment (theater, performances)
- Culinary experiences (food halls, tastings)

Return modified day JSON with "weatherAlternative": true flag and note explaining changes.
```

---

## 🎯 Activity Suggestion Prompts

### Prompt 6: Activity Suggestions by Time Slot

```
Suggest 5 unique activities for travelers in {destination}.

**Context**:
- Destination: {destination}, {country}
- Day: {dayNumber} of trip
- Time slot: {timeSlot}
- Already planned for this day: {existingActivities}
- Travel style: {travelType}
- Budget range: {budgetRange}
- Group composition: {groupType} (families, couples, solo, friends)
- Physical ability: {abilityLevel}
- Interests: {interests}

**Requirements**:
1. No overlap with existing activities
2. Geographically convenient (near existing activities or accommodation)
3. Appropriate for the time slot
4. Diverse in nature (don't suggest 3 museums)
5. Mix of popular and hidden gem experiences
6. Include at least one local/authentic experience
7. Consider energy levels (morning = high energy OK, evening = more relaxed)

For each activity provide:
- Engaging title
- Compelling 2-3 sentence description (sell the experience!)
- Specific location with landmark/area name
- Realistic duration
- Best time to visit within the time slot
- Estimated cost per person
- Category (Cultural, Adventure, Food, Nature, Shopping, etc.)
- Why it's special (unique selling point)
- Booking requirements (walk-in, reservation needed, tickets required)
- Difficulty level

Return JSON array:
[
  {
    "title": "string",
    "description": "string",
    "location": "string",
    "coordinates": {
      "lat": number,
      "lng": number
    },
    "duration": "string",
    "bestTime": "MORNING|AFTERNOON|EVENING|NIGHT",
    "estimatedCost": number,
    "currency": "string",
    "category": "string",
    "uniqueSellingPoint": "string",
    "bookingInfo": {
      "required": boolean,
      "advanceBookingDays": number,
      "bookingUrl": "string (if known)"
    },
    "difficultyLevel": "Easy|Moderate|Challenging",
    "suitableFor": ["families", "couples", "solo", "groups"],
    "openingHours": "string",
    "tips": ["string"]
  }
]
```

---

### Prompt 7: Hidden Gems & Local Experiences

```
Suggest 5 hidden gem activities or local experiences in {destination} that most tourists miss.

**Criteria**:
- Authentic local experiences
- Not found in typical guidebooks
- Preferred by locals
- Off-the-beaten-path locations
- Unique cultural insights
- Budget-friendly options welcome
- Safe and accessible for travelers

**Avoid**:
- Major tourist attractions
- Chain restaurants
- Shopping malls
- Typical sightseeing spots

**Include**:
- Local neighborhoods worth exploring
- Family-run restaurants or cafes
- Artisan workshops or studios
- Community markets or events
- Nature spots known to locals
- Cultural practices or traditions
- Street food famous among locals

For each suggestion, explain:
- Why locals love it
- How to get there (transportation)
- When to visit (timing is crucial)
- What to expect
- How to behave/what to know (cultural etiquette)
- Approximate cost

Return detailed JSON array with "hiddenGem": true flag.
```

---

### Prompt 8: Family-Friendly Activity Suggestions

```
Suggest 5 family-friendly activities in {destination} suitable for children aged {childAges}.

**Family Details**:
- Number of adults: {adults}
- Number of children: {children}
- Children ages: {ages}
- Special needs: {specialNeeds}
- Nap time needed: {napTime}
- Dietary restrictions: {dietaryRestrictions}

**Requirements**:
1. Safe and secure environments
2. Engaging for both adults and children
3. Educational value (learning through fun)
4. Bathroom facilities available
5. Food options nearby
6. Stroller accessible (if needed)
7. Indoor options in case of weather issues
8. Not too long (attention span appropriate)

**Activity Types**:
- Interactive museums or science centers
- Animal encounters (zoos, aquariums, farms)
- Outdoor playgrounds or parks
- Kid-friendly cultural experiences
- Hands-on workshops (crafts, cooking)
- Gentle adventure activities
- Entertainment (shows, performances)

For each activity include:
- Age appropriateness rating
- Educational benefits
- Entertainment value
- Typical time children stay engaged
- Parent comfort level (rest areas, cafes)
- Safety considerations
- Cost for family (total)

Return JSON with family-specific details.
```

---

## ✏️ Natural Language Editing Prompts

### Prompt 9: Itinerary Modification via Natural Language

```
You are helping a travel agent modify an existing itinerary based on their natural language request.

**Current Complete Itinerary**:
{currentItinerary}

**Package Context**:
- Destination: {destination}
- Total days: {totalDays}
- Budget: {budget} {currency}
- Travel type: {travelType}
- Group size: {groupSize}

**Agent's Request**: "{userRequest}"

**Your Task**:
Understand the agent's intent and modify the itinerary accordingly. Common requests include:
- "Replace X with Y"
- "Make day 3 more relaxed"
- "Add a cooking class somewhere"
- "Remove the museum visits"
- "Swap days 2 and 4"
- "Add more food experiences"
- "Make it more budget-friendly"
- "Include a sunrise activity"

**Instructions**:
1. Identify what needs to change
2. Modify only the relevant parts
3. Maintain overall itinerary structure
4. Ensure changes make logical sense (timing, location, flow)
5. Keep budget in mind
6. Preserve activities that weren't mentioned
7. Adjust subsequent activities if needed (timing conflicts)

**Output Requirements**:
- Return the COMPLETE updated itinerary (not just changes)
- Maintain all JSON structure and fields
- Add a "changes" array explaining what was modified
- Add a "summary" explaining the modifications in natural language

Return JSON:
{
  "itinerary": [/* complete updated itinerary */],
  "changes": [
    {
      "day": number,
      "type": "added|removed|replaced|modified|reordered",
      "description": "string (what changed)",
      "reason": "string (why based on user request)"
    }
  ],
  "summary": "string (2-3 sentences explaining all modifications)",
  "impactedBudget": {
    "previousTotal": number,
    "newTotal": number,
    "difference": number
  }
}
```

---

### Prompt 10: Style/Pace Adjustment

```
Adjust the existing itinerary to match the new pace/style: {newStyle}.

**Current Itinerary**: {itinerary}

**Adjustment Styles**:

**"More Relaxed"**:
- Reduce activities from 5 to 3-4 per day
- Increase time between activities
- Add breaks and free time
- Include spa/wellness activities
- Slower-paced experiences
- More meal time

**"More Active"**:
- Increase activities to 5-6 per day
- Add adventure/physical activities
- Early morning starts
- Pack days fuller
- Reduce free time

**"More Cultural"**:
- Prioritize museums, temples, historical sites
- Add local interactions
- Include traditional performances
- Replace modern activities with traditional ones

**"More Budget-Friendly"**:
- Replace paid activities with free alternatives
- Choose local eateries over fancy restaurants
- Use public transportation
- Find free viewpoints instead of paid ones
- Suggest free walking tours

**"More Luxurious"**:
- Upgrade experiences (private tours vs group)
- Include fine dining
- Add spa/wellness treatments
- Premium transportation options
- Exclusive access experiences

Modify the itinerary according to the requested style while maintaining the core destinations and theme.

Return complete updated itinerary JSON with style adjustment notes.
```

---

## 🔄 Optimization Prompts

### Prompt 11: Itinerary Logic & Flow Optimization

```
Analyze and optimize this itinerary for logical flow and efficiency.

**Current Itinerary**: {itinerary}

**Analyze for**:

1. **Geographic Efficiency**:
   - Are activities in the same area grouped together?
   - Is there excessive backtracking?
   - What's the total travel time per day?
   - Can we reduce travel by reordering?

2. **Timing Logic**:
   - Are opening hours respected?
   - Is there enough time for each activity?
   - Are meal times appropriate?
   - Is travel time between activities realistic?
   - Any scheduling conflicts?

3. **Energy Management**:
   - Balance of active vs. relaxed activities?
   - Recovery time after intense activities?
   - Avoiding fatigue accumulation?
   - Morning high-energy, evening relaxed?

4. **Experience Flow**:
   - Good variety day-to-day?
   - Building narrative throughout trip?
   - Climax moments well-placed?
   - Smooth transitions between themes?

5. **Practical Considerations**:
   - Restaurant availability (closed days)?
   - Crowd management (visiting popular spots at best times)?
   - Weather appropriateness?
   - Group size considerations?

**Provide**:
1. Overall rating (1-10) with breakdown by category
2. List of specific issues found
3. Prioritized recommendations
4. Optimized version (if significant improvements possible)

Return JSON:
{
  "analysis": {
    "overallRating": number,
    "ratings": {
      "geographicEfficiency": number,
      "timingLogic": number,
      "energyManagement": number,
      "experienceFlow": number,
      "practicalConsiderations": number
    }
  },
  "issues": [
    {
      "day": number,
      "severity": "low|medium|high|critical",
      "category": "geographic|timing|energy|flow|practical",
      "issue": "string (specific problem)",
      "impact": "string (how it affects the experience)",
      "recommendation": "string (how to fix)"
    }
  ],
  "quickWins": [
    "string (easy improvements with big impact)"
  ],
  "optimizedItinerary": {/* only if changes recommended */},
  "summary": "string (overall assessment and key recommendations)"
}
```

---

### Prompt 12: Budget Optimization

```
Optimize this itinerary to better fit the budget of {targetBudget} {currency}.

**Current Itinerary**: {itinerary}
**Current Total Cost**: {currentCost} {currency}
**Target Budget**: {targetBudget} {currency}
**Difference**: {difference} {currency} ({overOrUnder})

**Optimization Strategy**:

**If Over Budget**:
1. Identify most expensive activities
2. Suggest free or cheaper alternatives
3. Recommend cost-effective dining options
4. Propose public transportation instead of private
5. Find group discounts or combo tickets
6. Suggest visiting on discount days
7. Prioritize must-see vs. nice-to-have activities

**If Under Budget**:
1. Suggest premium upgrades
2. Add special experiences
3. Include fine dining options
4. Propose private tours or guides
5. Add unique activities
6. Suggest better accommodation
7. Include special access or VIP experiences

**Provide**:
- Item-by-item cost analysis
- Specific cost-saving or value-adding recommendations
- Alternative options with price comparisons
- Updated itinerary within budget
- No-compromise vs. budget-optimized versions

Return JSON:
{
  "costAnalysis": {
    "currentTotal": number,
    "targetBudget": number,
    "adjustmentNeeded": number,
    "adjustmentPercentage": number
  },
  "breakdown": [
    {
      "day": number,
      "activity": "string",
      "currentCost": number,
      "proposedCost": number,
      "savings": number,
      "modification": "string"
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "type": "remove|replace|downgrade|upgrade|add",
      "currentActivity": "string",
      "proposedActivity": "string",
      "costImpact": number,
      "experienceImpact": "minimal|moderate|significant",
      "reasoning": "string"
    }
  ],
  "optimizedItinerary": {/* updated itinerary within budget */},
  "budgetBreakdown": {
    "accommodation": number,
    "meals": number,
    "transportation": number,
    "activities": number,
    "miscellaneous": number,
    "total": number
  }
}
```

---

## 💰 Pricing Calculation Prompts

### Prompt 13: Detailed Package Pricing

```
Calculate detailed, realistic pricing for this tour package.

**Package Details**:
- Destination: {destination}, {country}
- Duration: {days} days, {nights} nights
- Group size: {groupSize}
- Travel type: {travelType}
- Season: {season}

**Itinerary**: {itinerary}

**Pricing Components**:

1. **Accommodation** ({nights} nights):
   - Hotel category: {hotelCategory} (Budget/3-star/4-star/5-star/Luxury)
   - Location: {locationPreference} (City center/Suburbs/Resort)
   - Room type: {roomType} (Standard/Deluxe/Suite)
   - Single occupancy cost: X per night
   - Double occupancy cost: Y per night
   - Taxes and fees: Z%

2. **Meals**:
   - Meal plan: {mealPlan} (B/B&D/Full Board/All-Inclusive)
   - Breakfast: included with accommodation or separate
   - Lunch: X per person average
   - Dinner: Y per person average
   - Special dining experiences: list separately

3. **Transportation**:
   - Airport transfers: cost
   - Inter-city travel: cost per mode
   - Local transportation: daily estimate
   - Private vehicle rental (if applicable): daily rate
   - Driver charges (if applicable): daily rate
   - Fuel and tolls: estimate

4. **Activities & Entrance Fees**:
   List each activity with:
   - Entrance/ticket cost per person
   - Guide fees (if applicable)
   - Equipment rental (if applicable)
   - Any add-on costs

5. **Guide Services**:
   - English-speaking guide: days needed × daily rate
   - Specialist guides: specific rates
   - Tips (suggested): amount

6. **Administrative Costs**:
   - Travel agency commission: X%
   - Booking fees: fixed amount
   - Contingency/emergency fund: 5-10%

7. **Taxes & Fees**:
   - Government taxes: X%
   - Service charges: Y%
   - Tourism fees: fixed amounts

**Calculate**:
- Base cost (actual expenses)
- Markup (agent profit margin: 15-25%)
- Final price per person
- Group discount (if applicable)
- Seasonal adjustment (high season +15-30%, low season -10-20%)

Return JSON:
{
  "pricingBreakdown": {
    "accommodation": {
      "hotelCategory": "string",
      "pricePerNight": number,
      "numberOfNights": number,
      "total": number,
      "taxesAndFees": number
    },
    "meals": {
      "breakfasts": {
        "included": boolean,
        "cost": number
      },
      "lunches": {
        "count": number,
        "avgCost": number,
        "total": number
      },
      "dinners": {
        "count": number,
        "avgCost": number,
        "total": number
      },
      "specialDining": [
        {
          "name": "string",
          "cost": number
        }
      ],
      "total": number
    },
    "transportation": {
      "airportTransfers": number,
      "interCity": number,
      "localTransport": number,
      "vehicleRental": number,
      "total": number
    },
    "activities": [
      {
        "day": number,
        "activity": "string",
        "entranceFee": number,
        "guideFee": number,
        "equipment": number,
        "other": number,
        "total": number
      }
    ],
    "guideServices": {
      "daysNeeded": number,
      "dailyRate": number,
      "total": number
    },
    "administrative": {
      "agencyCommission": number,
      "bookingFees": number,
      "contingency": number,
      "total": number
    },
    "taxesAndFees": {
      "governmentTax": number,
      "serviceCharge": number,
      "tourismFees": number,
      "total": number
    }
  },
  "costSummary": {
    "totalDirectCosts": number,
    "markup": {
      "percentage": number,
      "amount": number
    },
    "basePricePerPerson": number,
    "seasonalAdjustment": {
      "season": "string",
      "adjustmentPercentage": number,
      "amount": number
    },
    "finalPricePerPerson": number,
    "groupDiscount": {
      "applicable": boolean,
      "percentage": number,
      "discountedPrice": number
    },
    "totalForGroup": number
  },
  "paymentSchedule": [
    {
      "milestone": "string (e.g., 'At booking', '30 days before', 'On arrival')",
      "percentage": number,
      "amount": number,
      "dueDate": "string"
    }
  ],
  "cancellationPolicy": [
    {
      "timeframe": "string",
      "refundPercentage": number
    }
  ],
  "notes": [
    "string (important pricing notes)"
  ]
}
```

---

### Prompt 14: Cost Comparison Analysis

```
Compare the cost of our proposed package with typical market prices for {destination}.

**Our Package**: {packageDetails}
**Our Price**: {ourPrice} {currency}

Research typical pricing for:
1. Similar duration packages to this destination
2. Similar quality level (accommodation, activities)
3. Same season/time of year
4. Comparable inclusions

Provide:
- Market average price range
- Budget operator prices
- Mid-range operator prices
- Luxury operator prices
- Our position in the market
- Value proposition analysis
- Competitive advantages
- Areas where we might be over/underpriced

Return JSON with competitive analysis and recommendations.
```

---

## 📝 Description & Content Prompts

### Prompt 15: Engaging Activity Descriptions

```
Write compelling, sell-worthy descriptions for the following activities.

**Activities**: {activities}

For each activity, write:

1. **Title**: Catchy, evocative (30-50 characters)
2. **Short Description**: Hook them in one sentence (120 characters max)
3. **Detailed Description**: Full experience description (3-4 paragraphs):
   - Paragraph 1: What makes this special/unique
   - Paragraph 2: What travelers will do/see/experience
   - Paragraph 3: Practical details and what's included
   - Paragraph 4: Who this is perfect for
4. **Highlights**: 4-5 bullet points of key features
5. **What to Bring**: Practical items needed
6. **Pro Tips**: Insider advice for best experience

**Writing Style**:
- Vivid, sensory language (sights, sounds, tastes, feelings)
- Active voice and present tense
- Emotional appeal mixed with practical information
- Avoid clichés and generic phrases
- Use specific details over generalizations
- Create FOMO (fear of missing out)

**Example Good Description**:
"Step into the aromatic chaos of Tsukiji Market at dawn, where the day's freshest catch glistens under fluorescent lights and auctioneers' rapid-fire calls echo through the halls. This isn't just a market tour—it's a front-row seat to Tokyo's culinary heartbeat, where Michelin-starred chefs and local grandmothers alike hunt for the perfect tuna belly. Your expert guide will navigate you through the maze of stalls..."

**Example Bad Description**:
"Visit a famous market in Tokyo. See fish and other seafood. Learn about Japanese food culture. Duration is 3 hours."

Return JSON for each activity with enriched content.
```

---

### Prompt 16: Package Marketing Copy

```
Write compelling marketing copy for this tour package to be used on website and promotional materials.

**Package**: {packageDetails}

Create:

1. **Hero Headline**: Attention-grabbing main headline (60-80 characters)
2. **Sub-headline**: Supporting detail that entices (120-150 characters)
3. **Package Summary**: Compelling overview paragraph (150-200 words)
4. **Why Book This Package**: 5-6 unique selling points
5. **Perfect For**: Target audience description
6. **What Makes It Special**: 3-4 paragraphs on unique aspects
7. **Trip Highlights**: Day-by-day preview (1 sentence per day)
8. **Testimonial Template**: Sample review structure for this trip
9. **FAQ Responses**: Answers to common questions
10. **Call-to-Action**: Compelling CTA phrases

**Tone**: 
- Inspiring but authentic
- Exciting but informative
- Professional but warm
- Aspirational but achievable

**Include**:
- Emotional triggers (adventure, discovery, relaxation, transformation)
- Concrete details (specific experiences, not generalities)
- Social proof elements
- Urgency without being pushy
- Clear value proposition

Return structured marketing content JSON.
```

---

## ✅ Validation & Quality Check Prompts

### Prompt 17: Itinerary Quality Audit

```
Conduct a comprehensive quality audit of this itinerary.

**Itinerary**: {itinerary}
**Context**: {packageContext}

**Audit Checklist**:

1. **Completeness** (Score: /10):
   - All time slots filled appropriately?
   - No unexplained gaps?
   - Sufficient activity details?
   - Clear instructions provided?

2. **Realism** (Score: /10):
   - Activity durations realistic?
   - Travel times accurate?
   - Opening hours verified?
   - Physical demands appropriate?

3. **Variety** (Score: /10):
   - Good mix of activity types?
   - Cultural + leisure + food balance?
   - Indoor/outdoor variety?
   - Active/passive balance?

4. **Cultural Sensitivity** (Score: /10):
   - Respectful of local customs?
   - Appropriate dress codes noted?
   - Cultural etiquette mentioned?
   - Religious sensitivities respected?

5. **Practicality** (Score: /10):
   - Logical geographic flow?
   - Bathroom breaks considered?
   - Meal times appropriate?
   - Weather contingencies?

6. **Safety** (Score: /10):
   - Activities appropriate for group?
   - Safety briefings noted?
   - Emergency contacts included?
   - Health considerations addressed?

7. **Value** (Score: /10):
   - Good value for money?
   - No tourist traps?
   - Authentic experiences included?
   - Hidden costs avoided?

8. **Uniqueness** (Score: /10):
   - Not just cookie-cutter tourism?
   - Local/authentic experiences?
   - Memorable moments created?
   - Stories to tell?

**For Each Issue Found**:
- Severity: Critical/High/Medium/Low
- Location: Day X, Activity Y
- Problem: Specific issue
- Impact: How it affects the experience
- Recommendation: How to fix
- Priority: Must-fix/Should-fix/Nice-to-fix

**Overall Assessment**:
- Total score: X/80
- Grade: A+/A/B/C/D/F
- Ready to publish: Yes/No
- Required fixes before publishing: list

Return JSON:
{
  "overallScore": number,
  "grade": "string",
  "readyToPublish": boolean,
  "categoryScores": {
    "completeness": number,
    "realism": number,
    "variety": number,
    "culturalSensitivity": number,
    "practicality": number,
    "safety": number,
    "value": number,
    "uniqueness": number
  },
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "day": number,
      "activity": "string",
      "category": "string",
      "problem": "string",
      "impact": "string",
      "recommendation": "string",
      "priority": "must-fix|should-fix|nice-to-fix"
    }
  ],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "requiredFixes": ["string"],
  "suggestedImprovements": ["string"],
  "overallAssessment": "string (comprehensive summary)"
}
```

---

### Prompt 18: Safety & Accessibility Check

```
Review this itinerary for safety and accessibility concerns.

**Itinerary**: {itinerary}
**Group Profile**: {groupProfile}

**Check For**:

1. **Physical Accessibility**:
   - Wheelchair accessibility (if needed)
   - Stair/elevator situations
   - Walking distances
   - Physical exertion levels
   - Rest points availability

2. **Age Appropriateness**:
   - Activities suitable for children (if present)
   - Activities suitable for elderly (if present)
   - Pace appropriate for group
   - Attention span considerations

3. **Health & Safety**:
   - Food safety notes (street food, water quality)
   - Altitude considerations
   - Heat/cold exposure
   - Required vaccinations
   - Common health risks
   - Nearest hospitals/clinics
   - First aid availability

4. **Security**:
   - Safe areas vs. areas to avoid
   - Evening activity safety
   - Transportation safety
   - Scam awareness
   - Emergency contacts
   - Travel insurance recommendations

5. **Special Needs**:
   - Dietary restrictions accommodated
   - Allergies considered
   - Mobility assistance available
   - Language barriers addressed
   - Religious requirements met

**For Each Activity, Note**:
- Accessibility rating: Fully/Partially/Not accessible
- Physical difficulty: Easy/Moderate/Challenging
- Age recommendation: All ages/12+/18+
- Safety concerns: List any
- Alternatives if not suitable

Return JSON with detailed safety and accessibility assessment.
```

---

## 🚀 Advanced Feature Prompts

### Prompt 19: Seasonal Recommendations

```
Provide seasonal travel recommendations for {destination}.

**Destination**: {destination}
**Travel Dates**: {dates}

Analyze and provide:

1. **Climate & Weather**:
   - Expected weather conditions
   - Temperature range
   - Rainfall probability
   - Humidity levels
   - Best/worst times of day

2. **Seasonal Events**:
   - Festivals and celebrations
   - Local holidays (impacts on business hours)
   - Special exhibitions or events
   - Sports seasons
   - Cultural events

3. **Crowd Levels**:
   - Peak/shoulder/off season
   - Tourist volume expectation
   - Busy days vs. quiet days
   - Best times to visit popular attractions

4. **Pricing Impact**:
   - High/low season pricing
   - Accommodation costs
   - Activity costs
   - Flight prices
   - Overall budget impact

5. **Activity Suitability**:
   - What's best this season
   - What to avoid
   - Seasonal activities available
   - Weather-dependent alternatives

6. **Packing Recommendations**:
   - Essential clothing
   - Weather gear needed
   - Special equipment
   - What to leave at home

7. **Health Considerations**:
   - Seasonal illnesses
   - Allergy concerns
   - Sun protection needs
   - Insect precautions

8. **Recommendations**:
   - Is this the ideal time to visit?
   - Better alternative dates (if applicable)
   - How to make the most of this season
   - Season-specific tips

Return JSON with comprehensive seasonal analysis.
```

---

### Prompt 20: Sustainable & Responsible Travel Options

```
Modify this itinerary to be more sustainable and responsible.

**Current Itinerary**: {itinerary}

**Sustainability Criteria**:

1. **Environmental Impact**:
   - Reduce carbon footprint (transportation choices)
   - Support eco-friendly accommodations
   - Minimize plastic use
   - Choose walking/cycling over vehicles when possible
   - Support conservation efforts

2. **Social Responsibility**:
   - Support local businesses over chains
   - Fair wages and working conditions
   - Community-based tourism
   - Respect for local culture
   - No exploitation (animal or human)

3. **Economic Sustainability**:
   - Money stays in local economy
   - Support small businesses
   - Fair pricing
   - Direct booking with locals
   - Avoid over-touristed areas

4. **Cultural Respect**:
   - Appropriate behavior and dress
   - Permission for photography
   - Understanding local customs
   - Learning basic local phrases
   - Respectful engagement

**Modifications**:
- Replace any problematic activities
- Suggest eco-friendly alternatives
- Add responsible tourism practices
- Include educational components
- Provide cultural sensitivity guidelines

**Certifications to Look For**:
- Green Globe certified
- Rainforest Alliance
- Travelife
- EarthCheck
- B-Corp certified

Return modified itinerary with sustainability ratings and notes.
```

---

### Prompt 21: Multi-Language Support

```
Translate and culturally adapt this package description for {targetLanguage} speakers.

**Original Package**: {packageContent}
**Target Language**: {language}
**Target Market**: {country/region}

**Requirements**:
1. Accurate translation (not just literal)
2. Cultural adaptation (idioms, references)
3. Local preferences considered
4. Measurement units converted (if needed)
5. Date formats localized
6. Currency converted and formatted
7. Cultural sensitivities respected
8. Local marketing style applied

**Adapt**:
- Activity descriptions (what appeals to this market)
- Highlights (what they value)
- Marketing tone (formal vs. casual)
- Imagery suggestions (what resonates)
- Package duration (typical for this market)
- Meal preferences (dietary habits)
- Accommodation standards (expectations)

Return translated and adapted content with cultural notes.
```

---

### Prompt 22: Solo Traveler Adaptation

```
Adapt this group itinerary for a solo traveler.

**Original Package**: {packageDetails}

**Solo Traveler Considerations**:

1. **Safety**:
   - Safe neighborhoods for solo travelers
   - Evening activities appropriate for solo
   - Areas to avoid when alone
   - Check-in procedures
   - Emergency contacts

2. **Social Opportunities**:
   - Group tours where they can meet people
   - Social dining options
   - Hostel common areas
   - Group activities
   - Local meetups or events

3. **Pricing**:
   - Single supplement costs
   - Solo-friendly accommodations
   - Shared tour cost savings
   - Activities that don't penalize solo booking

4. **Flexibility**:
   - More free time for spontaneity
   - Optional vs. fixed activities
   - Easy to skip/add activities
   - Self-paced exploration

5. **Loneliness Mitigation**:
   - Balance of social and alone time
   - Interactive activities
   - Places to meet fellow travelers
   - Engaging with locals

6. **Practical Concerns**:
   - Safe luggage storage
   - Restaurant reservations for one
   - Photography assistance
   - Navigation help

Modify itinerary with solo traveler best practices and safety notes.
```

---

### Prompt 23: Luxury Upgrade Suggestions

```
Suggest luxury upgrades to transform this package into a premium experience.

**Base Package**: {packageDetails}
**Current Price**: {currentPrice}
**Target Luxury Price**: {targetPrice}

**Luxury Enhancements**:

1. **Accommodation**:
   - Upgrade to 5-star or boutique hotels
   - Suites instead of standard rooms
   - Hotels with spa/wellness centers
   - Unique properties (historic, design hotels)
   - Private villas or residences

2. **Transportation**:
   - Private chauffeur-driven vehicles
   - First-class train/flight tickets
   - Helicopter transfers
   - Luxury car rentals
   - VIP airport services

3. **Dining**:
   - Michelin-starred restaurants
   - Private chef experiences
   - Wine pairings and tastings
   - Exclusive dining venues
   - In-room dining options

4. **Activities**:
   - Private guides instead of group
   - After-hours exclusive access
   - VIP experiences
   - Masterclasses with experts
   - Unique access to restricted areas

5. **Services**:
   - Personal concierge
   - Private photography
   - Spa treatments
   - Personal shoppers
   - Butler service

6. **Unique Experiences**:
   - Behind-the-scenes access
   - Meet local celebrities/artisans
   - Private performances
   - Exclusive workshops
   - One-of-a-kind adventures

Return upgraded itinerary with luxury options and new pricing.
```

---

### Prompt 24: Last-Minute Itinerary Creation

```
Create a quick, reliable itinerary for a last-minute trip to {destination}.

**Details**:
- Destination: {destination}
- Departure: {departureDate} (in {daysUntil} days!)
- Duration: {days} days
- Budget: {budget}
- Travelers: {travelers}

**Last-Minute Constraints**:
1. Accommodation must be currently available
2. Activities don't require advance booking
3. Popular restaurants with walk-in availability
4. Flexible cancellation policies preferred
5. No sold-out attractions

**Strategy**:
- Focus on walk-in friendly activities
- Include backup options for each day
- Suggest apps/services for last-minute bookings
- Note what can be booked on arrival
- What requires online advance booking (do NOW)

**Immediate Action Items**:
- Book these now: [list with links]
- Can book on arrival: [list]
- No booking needed: [list]

**Last-Minute Tips**:
- Best apps to download
- Local SIM card info
- Currency exchange
- Emergency contacts
- Essential phrases

Return practical, actionable itinerary with immediate next steps.
```

---

### Prompt 25: Special Occasion Celebration Integration

```
Integrate a special celebration into this itinerary.

**Base Itinerary**: {itinerary}
**Occasion**: {occasion} (birthday, anniversary, honeymoon, proposal, graduation, etc.)
**Celebration Day**: Day {day}
**Budget for Special Elements**: {celebrationBudget}

**Special Occasion Ideas**:

**Birthday**:
- Surprise cake delivery
- Special birthday dinner
- Group celebration activity
- Personalized touches
- Local birthday traditions

**Anniversary**:
- Romantic dinner setting
- Couple's spa treatment
- Private sunset experience
- Renewal ceremony option
- Romantic photo session

**Honeymoon**:
- Romantic upgrades throughout
- Couple's experiences
- Privacy and intimacy focus
- Special amenities
- Honeymoon package benefits

**Proposal**:
- Perfect proposal location and timing
- Ring security considerations
- Photography arrangement
- Celebration dinner reservation
- Backup plan (weather dependent)

**For Each Occasion**:
1. Suggest perfect moments for celebration
2. Recommend special activities
3. Dining reservations with special requests
4. Accommodation romantic upgrades
5. Surprise elements
6. Photography opportunities
7. Local celebration traditions
8. Keepsake ideas

**Logistics**:
- How to keep surprises secret (if applicable)
- Coordination with hotels/restaurants
- Special permissions needed
- Timing considerations
- Budget allocation

Return modified itinerary with celebration integration and coordination notes.
```

---

## 🎯 Prompt Templates by Use Case

### Quick Reference: Which Prompt to Use When

**Agent wants to**:
- Create new package from scratch → **Prompt 1**
- Create themed package → **Prompt 2**
- Create multi-city tour → **Prompt 3**
- Build single day → **Prompt 4**
- Handle bad weather → **Prompt 5**
- Get activity ideas → **Prompt 6**
- Find hidden gems → **Prompt 7**
- Plan for families → **Prompt 8**
- Modify existing itinerary → **Prompt 9**
- Change pace/style → **Prompt 10**
- Optimize flow → **Prompt 11**
- Adjust budget → **Prompt 12**
- Calculate detailed costs → **Prompt 13**
- Check market pricing → **Prompt 14**
- Write descriptions → **Prompt 15**
- Create marketing copy → **Prompt 16**
- Audit quality → **Prompt 17**
- Check safety → **Prompt 18**
- Get seasonal advice → **Prompt 19**
- Make sustainable → **Prompt 20**
- Translate package → **Prompt 21**
- Adapt for solo → **Prompt 22**
- Add luxury upgrades → **Prompt 23**
- Create last-minute trip → **Prompt 24**
- Add celebration → **Prompt 25**

---

## 💡 Prompt Engineering Best Practices

### 1. Specificity is Key
❌ "Create a package for Paris"
✅ "Create a 7-day cultural immersion package for Paris, France, targeting couples aged 30-45, budget $3000 per person, focusing on art, architecture, and culinary experiences"

### 2. Provide Context
Always include:
- Destination details
- Traveler profile
- Budget range
- Trip purpose
- Time of year
- Special requirements

### 3. Request Structured Output
Always specify exact JSON structure needed for your application

### 4. Set Constraints
- Maximum activities per day
- Budget limits
- Physical activity levels
- Time constraints

### 5. Include Examples
Show the model what good output looks like

### 6. Iterate and Refine
- Test prompts with different inputs
- Refine based on output quality
- Document what works best

### 7. Handle Edge Cases
Address:
- Very short trips (1-2 days)
- Very long trips (30+ days)
- Extreme budgets (very low or very high)
- Unusual group compositions
- Special needs

### 8. Request Validation
Ask the model to validate its own output:
"Before returning JSON, verify that all activities have realistic durations and that there are no timing conflicts."

---

## 🔧 Implementation Tips

### Using These Prompts in Code

```javascript
// Example usage
const prompt = `
${SYSTEM_PROMPT} // Use the base system prompt

${PROMPT_1} // Add specific task prompt

// Fill in variables
`.replace('{destination}', userInput.destination)
 .replace('{days}', userInput.days)
 .replace('{budget}', userInput.budget);

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }]
});
```

### Prompt Versioning
Keep track of prompt versions and their performance:

```javascript
const PROMPTS = {
  packageGeneration: {
    v1: "...",
    v2: "...",
    current: "v2"
  }
};
```

### A/B Testing Prompts
Test different prompt variations to find what works best:

```javascript
const promptVariants = {
  detailed: PROMPT_1,
  concise: PROMPT_1_CONCISE
};

// Test both and measure quality
```

---

## 📊 Success Metrics

Track these to improve prompts:
- Generation success rate
- Manual edit rate (lower is better)
- Agent satisfaction ratings
- Time to create package
- Customer booking conversion
- Quality audit scores

---

## 🎓 Continuous Improvement

### Prompt Refinement Process
1. Collect feedback on AI outputs
2. Identify common issues
3. Update prompts accordingly
4. Test improvements
5. Document changes
6. Share with team

### Learning from Edits
When agents edit AI outputs:
- Track what they change
- Identify patterns
- Update prompts to address common edits
- Reduce need for manual fixes

---

**Document Version**: 1.0
**Last Updated**: February 2026
**Maintained By**: TourSaaS Development Team

---

## 📞 Need Help?

If outputs aren't meeting expectations:
1. Review prompt specificity
2. Check input data quality
3. Verify JSON structure matches code
4. Test with simpler inputs first
5. Iterate on prompt wording
6. Consult Anthropic's prompt engineering guide

---

Ready to build amazing AI-powered travel experiences! 🚀✨
