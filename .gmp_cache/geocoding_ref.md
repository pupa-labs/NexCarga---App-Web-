# Return the latitude/longitude coordinates of an address (geocoding)

Forward geocoding translates a physical address or Plus Code into geographical
coordinates (latitude and longitude), a Place ID, a Plus Code, and expanded
address details.

## Overview

A geocode request is an HTTP `GET` request made to the Geocoding API v4
endpoint. You can pass the address either as an unstructured string in the URL
path or as a structured set of `PostalAddress` query parameters.

> **Important:** URLs must be properly URL-encoded and are limited to 4096
> characters. Avoid passing unsupported queries such as raw latitude/longitude
> coordinates (use reverse geocoding instead), non-geospatial queries, P.O.
> boxes, or business names paired with locations where they do not exist.

## Request Formats

### 1. Unstructured Address Request

Pass the URL-encoded address string or Plus Code directly in the path:

```http
GET https://geocode.googleapis.com/v4/geocode/address/{ADDRESS_STRING}
```

#### Special Character Encoding Rules

*   **Spaces:** Encode as `%20` or `+`.
*   **Slashes (`/`):** Encode as `%2F` (e.g., `7/1 King St` becomes
    `7%2F1+King+St`).
*   **Hash (`#`):** Encode as `%23` (e.g., `#650` becomes `%23650`).
*   **Plus Codes (`+`):** Encode the plus sign as `%2B` (e.g., `849VCWC8+R4`
    becomes `849VCWC8%2BR4`).

#### cURL Example (Unstructured Address with Field Mask)

Use the `X-Goog-FieldMask` header to limit the response to only the fields you
need (such as `location`, `placeId`, and `formattedAddress`), and include the
required usage attribution header `X-Goog-Maps-Solution-ID`.

```bash
curl -X GET \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: YOUR_API_KEY" \
  -H "X-Goog-FieldMask: results.placeId,results.location,results.formattedAddress" \
  -H "X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1" \
  "https://geocode.googleapis.com/v4/geocode/address/1600%20Amphitheatre%20Parkway,%20Mountain%20View,%20CA"
```

--------------------------------------------------------------------------------

### 2. Structured Address Request

When processing individual address components (e.g., from an HTML form), pass
the components as query parameters using the `address` (`PostalAddress`) object
properties:

```http
GET https://geocode.googleapis.com/v4/geocode/address?address.addressLines={STREET}&address.locality={CITY}&address.administrativeArea={STATE}&address.postalCode={ZIP}
```

#### cURL Example (Structured Address)

```bash
curl -X GET \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: YOUR_API_KEY" \
  -H "X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1" \
  "https://geocode.googleapis.com/v4/geocode/address?address.addressLines=1600+Amphitheatre+Pkwy&address.locality=Mountain+View&address.administrativeArea=CA&address.postalCode=94043"
```

--------------------------------------------------------------------------------

## Authentication

You can authenticate requests using either an API Key or an OAuth 2.0 token:

*   **API Key:** Pass via the `X-Goog-Api-Key: YOUR_API_KEY` HTTP header or the
    `key=YOUR_API_KEY` query parameter.
*   **OAuth 2.0:** Pass via the `Authorization: Bearer YOUR_OAUTH_TOKEN` header.
    Supported scopes for forward geocoding:
    *   `https://www.googleapis.com/auth/maps-platform.geocode` (All Geocoding
        API methods)
    *   `https://www.googleapis.com/auth/maps-platform.geocode.address` (Forward
        geocoding only)
    *   `https://www.googleapis.com/auth/cloud-platform` (General development
        scope)

--------------------------------------------------------------------------------

## Parameters

### Required Parameters

Parameter | Description
:-------- | :----------
`address` | Passed either in the URL path as an unstructured string/Plus Code, or as structured `address.*` query parameters (`address.addressLines`, `address.locality`, `address.administrativeArea`, `address.postalCode`, `address.regionCode`).

### Optional Parameters

Parameter                                  | Type / Format                       | Description
:----------------------------------------- | :---------------------------------- | :----------
`X-Goog-FieldMask` or `fields` / `$fields` | Header or Query Param               | Specifies which fields to return in the response (e.g., `results.location,results.placeId`). Strongly recommended to avoid unnecessary processing time.
`locationBias`                             | Rectangular `Viewport` query params | Instructs the service to prefer results within a bounding box defined by southwest (`low`) and northeast (`high`) corners. Note: Ignored if the address contains an explicit location (e.g., `Barcelona, Spain`).<br><br>**Format:**<br>`locationBias.rectangle.low.latitude={SW_LAT}`<br>`&locationBias.rectangle.low.longitude={SW_LNG}`<br>`&locationBias.rectangle.high.latitude={NE_LAT}`<br>`&locationBias.rectangle.high.longitude={NE_LNG}`
`regionCode`                               | 2-character CLDR code               | Biases results to a specific region (e.g., `es` for Spain, `us` for United States).
`languageCode`                             | BCP-47 language code                | The language in which to return results (e.g., `en`, `es`). Defaults to the local language of the location if omitted.

#### Example with Location and Region Biasing

```bash
curl -X GET \
  -H "X-Goog-Api-Key: YOUR_API_KEY" \
  -H "X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1" \
  "https://geocode.googleapis.com/v4/geocode/address/Washington?regionCode=us&locationBias.rectangle.low.latitude=36.47&locationBias.rectangle.low.longitude=-84.72&locationBias.rectangle.high.latitude=43.39&locationBias.rectangle.high.longitude=-65.90"
```

--------------------------------------------------------------------------------

## Response Structure

The API returns a `GeocodeAddressResponse` JSON object containing a `results`
array of `GeocodeResult` objects.

```json
{
  "results": [
    {
      "place": "//places.googleapis.com/places/ChIJF4Yf2Ry7j4AR__1AkytDyAE",
      "placeId": "ChIJF4Yf2Ry7j4AR__1AkytDyAE",
      "location": {
        "latitude": 37.422010799999995,
        "longitude": -122.08474779999999
      },
      "granularity": "ROOFTOP",
      "viewport": {
        "low": {
          "latitude": 37.420656719708511,
          "longitude": -122.08547523029148
        },
        "high": {
          "latitude": 37.4233546802915,
          "longitude": -122.0827772697085
        }
      },
      "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
      "postalAddress": {
        "regionCode": "US",
        "languageCode": "en",
        "postalCode": "94043",
        "administrativeArea": "CA",
        "locality": "Mountain View",
        "addressLines": [
          "1600 Amphitheatre Pkwy"
        ]
      },
      "addressComponents": [
        {
          "longText": "1600",
          "shortText": "1600",
          "types": [
            "street_number"
          ]
        },
        {
          "longText": "Amphitheatre Parkway",
          "shortText": "Amphitheatre Pkwy",
          "types": [
            "route"
          ],
          "languageCode": "en"
        }
      ],
      "types": [
        "street_address"
      ],
      "plusCode": {
        "globalCode": "849VCWC8+R4",
        "compoundCode": "CWC8+R4 Mountain View, CA, USA"
      }
    }
  ]
}
```

### Key Response Fields

*   **`results[].location`**: Contains the `latitude` and `longitude`
    coordinates.
*   **`results[].placeId`**: Unique identifier for the place that can be used
    with other Google Maps APIs.
*   **`results[].granularity`**: Indicates the precision of the geocoded
    location (e.g., `ROOFTOP`, `APPROXIMATE`).
*   **`results[].types`**: Indicates the overall place type(s) of the result.
*   **`results[].addressComponents[].types`**: Indicates the type of each
    specific part of the address (e.g., `street_number`, `route`, `locality`).
