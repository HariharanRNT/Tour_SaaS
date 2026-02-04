"""
TripJack Flight API Adapter

Handles integration with TripJack Flight Management System API
for flight search and booking operations.
"""

import httpx
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from decimal import Decimal

logger = logging.getLogger(__name__)


class TripJackAdapter:
    """Adapter for TripJack Flight API"""
    
    def __init__(self, api_key: str, base_url: str):
        """
        Initialize TripJack adapter
        
        Args:
            api_key: TripJack API key
            base_url: Base URL for TripJack API
        """
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json",
            "apikey": api_key
        }
    
    async def search_flights(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        return_date: Optional[str] = None,
        adults: int = 1,
        children: int = 0,
        infants: int = 0,
        cabin_class: str = "ECONOMY",
        is_direct_flight: bool = True,
        is_connecting_flight: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Search for flights using TripJack API
        
        Args:
            origin: Origin airport/city code (e.g., 'MAA')
            destination: Destination airport/city code (e.g., 'DEL')
            departure_date: Departure date in YYYY-MM-DD format
            return_date: Return date in YYYY-MM-DD format (optional for one-way)
            adults: Number of adult passengers
            children: Number of child passengers
            infants: Number of infant passengers
            cabin_class: Cabin class (ECONOMY, BUSINESS, FIRST)
            is_direct_flight: Filter for direct flights
            is_connecting_flight: Filter for connecting flights
            
        Returns:
            List of flight options
        """
        # Build route infos
        route_infos = [
            {
                "fromCityOrAirport": {"code": origin.upper()},
                "toCityOrAirport": {"code": destination.upper()},
                "travelDate": departure_date
            }
        ]
        
        # Add return flight if round-trip
        if return_date:
            route_infos.append({
                "fromCityOrAirport": {"code": destination.upper()},
                "toCityOrAirport": {"code": origin.upper()},
                "travelDate": return_date
            })
        
        # Build search request
        search_request = {
            "searchQuery": {
                "cabinClass": cabin_class.upper(),
                "paxInfo": {
                    "ADULT": str(adults),
                    "CHILD": str(children),
                    "INFANT": str(infants)
                },
                "routeInfos": route_infos,
                "searchModifiers": {
                    "isDirectFlight": is_direct_flight,
                    "isConnectingFlight": is_connecting_flight
                }
            }
        }
        
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"Searching flights: {origin} -> {destination} on {departure_date}")
                
                response = await client.post(
                    f"{self.base_url}/fms/v1/air-search-all",
                    json=search_request,
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check for logical errors in 200 OK response
                    if 'status' in data and not data['status'].get('success', True):
                        error_msg = "Unknown error"
                        if 'errors' in data and data['errors']:
                            error_msg = "; ".join([f"{e.get('errCode')} - {e.get('message')}" for e in data['errors']])
                        
                        logger.error(f"TripJack API returned parsed error: {error_msg}")
                        raise Exception(f"TripJack API Error: {error_msg}")
                    
                    logger.info(f"TripJack API response received (Pricing Fix Active)")
                    
                    # Normalize flight results
                    flights = self._normalize_flights(data, adults, children, infants)
                    logger.info(f"Found {len(flights)} flight options")
                    return flights
                    
                elif response.status_code == 404:
                    logger.warning(f"No flights found for route {origin} -> {destination}")
                    return []
                else:
                    logger.error(f"TripJack API error: {response.status_code} - {response.text}")
                    response.raise_for_status()
                    
            except httpx.HTTPError as e:
                logger.error(f"TripJack API request failed: {e}")
                raise Exception(f"Failed to search flights: {str(e)}")
            except Exception as e:
                logger.error(f"Unexpected error in flight search: {e}")
                raise Exception(f"Failed to search flights: {str(e)}")

    async def review_booking(self, price_ids: List[str]) -> Dict[str, Any]:
        """
        Review booking before confirmation (Price Check)
        API: POST /fms/v1/review
        """
        payload = {"priceIds": price_ids}
        
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"Reviewing booking for price_ids: {price_ids}")
                response = await client.post(
                    f"{self.base_url}/fms/v1/review",
                    json=payload,
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Check for success status in response
                    if 'status' in data and not data['status'].get('success', True):
                         error_msg = self._extract_error(data)
                         raise Exception(f"TripJack Review Error: {error_msg}")
                    return data
                else:
                    logger.error(f"TripJack Review failed: {response.status_code} - {response.text}")
                    response.raise_for_status()
            except httpx.HTTPError as e:
                logger.error(f"TripJack Review API failed: {e}")
                raise Exception(f"Failed to review booking: {str(e)}")
            except Exception as e:
                logger.error(f"TripJack Review API failed: {e}")
                raise Exception(f"Failed to review booking: {str(e)}")

    async def book_flight(self, booking_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Book flight
        API: POST /oms/v1/air/book
        """
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"Booking flight with payload: {booking_payload}")
                response = await client.post(
                    f"{self.base_url}/oms/v1/air/book",
                    json=booking_payload,
                    headers=self.headers,
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'status' in data and not data['status'].get('success', True):
                         error_msg = self._extract_error(data)
                         raise Exception(f"TripJack Booking Error: {error_msg}")
                    return data
                else:
                    logger.error(f"TripJack Booking failed: {response.status_code} - {response.text}")
                    response.raise_for_status()
            except Exception as e:
                logger.error(f"TripJack Booking API failed: {e}")
                raise Exception(f"Failed to book flight: {str(e)}")

    def _extract_error(self, data: Dict[str, Any]) -> str:
        """Helper to extract error message from TripJack response"""
        if 'errors' in data and data['errors']:
            return "; ".join([f"{e.get('errCode')} - {e.get('message')}" for e in data['errors']])
        return "Unknown error"
    
    def _normalize_flights(self, raw_data: Dict[str, Any], adults: int = 1, children: int = 0, infants: int = 0) -> List[Dict[str, Any]]:
        """
        Normalize TripJack flight data to our standard format
        
        Args:
            raw_data: Raw response from TripJack API
            
        Returns:
            List of normalized flight dictionaries
        """
        normalized_flights = []
        
        try:
            # Extract flight options from response
            # Note: Actual structure depends on TripJack response format
            # Extract flight options from response
            search_result = raw_data.get('searchResult', {})
            if not search_result:
                 logger.warning("No searchResult found in response")
                 return []

            trip_infos = search_result.get('tripInfos', {})
            if not trip_infos:
                 logger.warning("No tripInfos found in searchResult")
                 return []
            
            # Process each flight option
            for route_key, flight_list in trip_infos.items():
                if isinstance(flight_list, list):
                    for flight_option in flight_list:
                        normalized_flight = self._normalize_single_flight(flight_option, adults, children, infants)
                        if normalized_flight:
                            # Tag with the route key (ONWARD/RETURN) for frontend grouping
                            normalized_flight['route_type'] = route_key
                            normalized_flights.append(normalized_flight)
            
            return normalized_flights
            
        except Exception as e:
            logger.error(f"Error normalizing flight data: {e}")
            logger.debug(f"Raw data: {raw_data}")
            return []
    
    def _normalize_single_flight(self, flight_data: Dict[str, Any], adults: int = 1, children: int = 0, infants: int = 0) -> Optional[Dict[str, Any]]:
        """
        Normalize a single flight option
        
        Args:
            flight_data: Raw flight data
            
        Returns:
            Normalized flight dictionary
        """
        try:
            # Extract segments
            segments = flight_data.get('sI', [])
            if not segments:
                return None
            
            first_segment = segments[0]
            last_segment = segments[-1]
            
            # Extract airline info
            airline_code = first_segment.get('fD', {}).get('aI', {}).get('code', '')
            airline_name = first_segment.get('fD', {}).get('aI', {}).get('name', '')
            flight_number = first_segment.get('fD', {}).get('fN', '')
            
            # Extract timing
            departure_time = first_segment.get('dt', '')
            arrival_time = last_segment.get('at', '')
            
            # Calculate duration
            # Calculate duration
            if departure_time and arrival_time:
                try:
                    dep_dt = datetime.fromisoformat(departure_time)
                    arr_dt = datetime.fromisoformat(arrival_time)
                    diff = arr_dt - dep_dt
                    total_seconds = int(diff.total_seconds())
                    duration_hours = total_seconds // 3600
                    duration_mins = (total_seconds % 3600) // 60
                    duration_str = f"{duration_hours}h {duration_mins}m"
                    duration_minutes = total_seconds // 60
                except ValueError:
                    duration_str = "N/A"
                    duration_minutes = 0
            else:
                 duration_str = "N/A"
                 duration_minutes = 0
            
            # Extract pricing
            # User updated: Get price from totalPriceList -> TF
            total_price = 0
            base_fare = 0
            tax = 0
            price_id = ""
                
            if 'totalPriceList' in flight_data and flight_data['totalPriceList']:
                # Filter for PUBLISHED fare
                price_entry = None
                for entry in flight_data['totalPriceList']:
                    if entry.get('fareIdentifier') == 'PUBLISHED':
                        price_entry = entry
                        break
                
                # Fallback to first if PUBLISHED not found
                if not price_entry:
                     price_entry = flight_data['totalPriceList'][0]
                
                # Extract the Price ID (crucial for Review call)
                price_id = price_entry.get('id', '')
                
                # Navigate nested structure: fd -> ADULT -> fC -> TF
                fare_details = price_entry.get('fd', {})
                
                # Calculate Total Price based on Pax Counts
                # Logic: Sum (Count * PaxTypePrice)
                
                pax_types = {
                    'ADULT': adults,
                    'CHILD': children,
                    'INFANT': infants
                }

                for pax_type, count in pax_types.items():
                    if count > 0:
                        type_fare = fare_details.get(pax_type, {}).get('fC', {})
                        # If specific pax type fare missing, might fallback to ADULT or skip (safe to skip if 0)
                        if not type_fare and pax_type != 'ADULT':
                             # Try fallback to ADULT if child/infant missing? No, that's risky. 
                             # If missing, it implies that pax type isn't supported in this fare.
                             continue
                        
                        # Fallback for ADULT if missing (shouldn't happen in valid response)
                        if not type_fare and pax_type == 'ADULT':
                             first_key = next(iter(fare_details))
                             type_fare = fare_details[first_key].get('fC', {})

                        t_price = float(type_fare.get('TF', 0))
                        b_fare = float(type_fare.get('BF', 0))
                        t_tax = float(type_fare.get('TAF', 0))
                        
                        total_price += (t_price * count)
                        base_fare += (b_fare * count)
                        tax += (t_tax * count)
                
                # Extract baggage info
                # fd -> ADULT -> bI -> iB/cB
                baggage_info = fare_details.get('ADULT', {}).get('bI', {})
                check_in = baggage_info.get('iB', '')
                cabin = baggage_info.get('cB', '')
                
                # Extract Cabin Class
                cabin_class = fare_details.get('ADULT', {}).get('cc', 'ECONOMY')
                
                # Format as requested: "Cabin-baggage: {cB}, Check-in: {iB}, Class: {cc}"
                baggage_str = f"Cabin-baggage: {cabin}, Check-in: {check_in}, Class: {cabin_class}"
                
            else:
                # Fallback to old logic
                total_price_info = flight_data.get('totalPriceInfo', {})
                total_fare = total_price_info.get('totalFareDetail', {}).get('fC', {})
                base_fare = float(total_fare.get('BF', 0))
                tax = float(total_fare.get('TAF', 0))
                total_price = base_fare + tax
                baggage_str = self._extract_baggage_info(segments)
                price_id = flight_data.get('id', '') # Fallback
            
            # Count stops
            stops = len(segments) - 1
            
            return {
                "id": flight_data.get('id', ''),
                "price_id": price_id, # Added price_id
                "airline": airline_name or airline_code,
                "airline_code": airline_code,
                "flight_number": flight_number,
                "origin": first_segment.get('da', {}).get('code', ''),
                "destination": last_segment.get('aa', {}).get('code', ''),
                "departure_time": departure_time,
                "arrival_time": arrival_time,
                "duration": duration_str,
                "duration_minutes": duration_minutes,
                "price": Decimal(str(total_price)),
                "base_fare": Decimal(str(base_fare)),
                "tax": Decimal(str(tax)),
                "currency": "INR",
                "cabin_class": flight_data.get('cabinClass', 'ECONOMY'),
                "stops": stops,
                "segments": len(segments),
                "is_refundable": flight_data.get('isRefundable', False),
                "baggage": baggage_str,
                "raw_data": flight_data  # Store for booking
            }
            
        except Exception as e:
            logger.error(f"Error normalizing single flight: {e}")
            return None
    
    async def get_booking_details(self, booking_id: str) -> Dict[str, Any]:
        """
        Get booking details
        API: POST /oms/v1/booking-details
        """
        payload = {"bookingId": booking_id}
        
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"Fetching booking details for: {booking_id}")
                response = await client.post(
                    f"{self.base_url}/oms/v1/booking-details",
                    json=payload,
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Check for success status in response if applicable
                    # (Assuming standard wrapper, but sometimes details endpoints are direct)
                    if 'status' in data and not data['status'].get('success', True):
                         error_msg = self._extract_error(data)
                         raise Exception(f"TripJack details retrieval Error: {error_msg}")
                    return data
                else:
                    logger.error(f"TripJack details retrieval failed: {response.status_code} - {response.text}")
                    response.raise_for_status()
            except Exception as e:
                logger.error(f"TripJack details retrieval API failed: {e}")
                # Don't fail the whole flow if retrieval fails, we can try later
                return {}

    def _extract_baggage_info(self, segments: List[Dict[str, Any]]) -> str:
        """Extract baggage allowance information"""
        try:
            if segments:
                baggage = segments[0].get('bI', {})
                cabin_bag = baggage.get('cB', '')
                check_in = baggage.get('iB', '')
                return f"Cabin: {cabin_bag}, Check-in: {check_in}"
        except:
            pass
        return "Check with airline"
