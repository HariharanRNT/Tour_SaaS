import json
import uuid
import re
import os
import sys

# Add the current directory to sys.path so app can be imported
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from fastapi.openapi.utils import get_openapi
from app.main import app

def generate_postman_collection():
    print("Generating OpenAPI schema from FastAPI app...")
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
    )
    
    print("Converting OpenAPI schema to Postman Collection v2.1.0 format...")
    info = {
        "_postman_id": str(uuid.uuid4()),
        "name": openapi_schema.get("info", {}).get("title", "Tour SaaS API"),
        "description": openapi_schema.get("info", {}).get("description", "Auto-generated Postman Collection from FastAPI"),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    }
    
    folders = {}
    components = openapi_schema.get("components", {})
    
    def resolve_schema(schema, name="", seen_refs=None):
        if seen_refs is None:
            seen_refs = set()
            
        if not schema:
            return None
            
        if "$ref" in schema:
            ref_name = schema["$ref"].split("/")[-1]
            if ref_name in seen_refs:
                return {}
            seen_refs.add(ref_name)
            res = resolve_schema(components.get("schemas", {}).get(ref_name), name, seen_refs)
            seen_refs.remove(ref_name)
            return res
        
        if "allOf" in schema:
            merged = {}
            for sub in schema["allOf"]:
                resolved = resolve_schema(sub, name, seen_refs)
                if isinstance(resolved, dict):
                    merged.update(resolved)
            return merged
            
        if "anyOf" in schema:
            return resolve_schema(schema["anyOf"][0], name, seen_refs)
            
        if "oneOf" in schema:
            return resolve_schema(schema["oneOf"][0], name, seen_refs)
            
        schema_type = schema.get("type")
        if schema_type == "object":
            obj = {}
            properties = schema.get("properties", {})
            for prop_name, prop_schema in properties.items():
                obj[prop_name] = resolve_schema(prop_schema, prop_name, seen_refs)
            return obj
        elif schema_type == "array":
            items_schema = schema.get("items", {})
            resolved_item = resolve_schema(items_schema, name, seen_refs)
            return [resolved_item] if resolved_item is not None else []
        else:
            default = schema.get("default")
            if default is not None:
                return default
            
            fmt = schema.get("format")
            if schema_type == "string":
                if fmt == "date-time":
                    return "2026-05-19T18:00:00Z"
                elif fmt == "date":
                    return "2026-05-19"
                elif "email" in name.lower():
                    return "user@example.com"
                elif "phone" in name.lower() or "mobile" in name.lower():
                    return "+1234567890"
                elif "password" in name.lower():
                    return "secure_password123"
                elif "token" in name.lower():
                    return "jwt_token_placeholder"
                return f"example_{name}" if name else "string"
            elif schema_type == "integer":
                return 1
            elif schema_type == "number":
                return 1.0
            elif schema_type == "boolean":
                return True
            return None

    paths = openapi_schema.get("paths", {})
    total_endpoints = 0
    
    for path, path_info in paths.items():
        # Convert path parameters {param} to :param for Postman
        postman_path_str = re.sub(r'\{([^}]+)\}', r':\1', path)
        path_parts = [p for p in postman_path_str.strip("/").split("/") if p]
        
        for method, route_info in path_info.items():
            method = method.upper()
            total_endpoints += 1
            
            # Group by tag
            tags = route_info.get("tags", ["General"])
            tag = tags[0]
            
            if tag not in folders:
                folders[tag] = {
                    "name": tag,
                    "item": []
                }
            
            req_name = route_info.get("summary") or route_info.get("operationId") or f"{method} {path}"
            headers = []
            
            # Simple check for authentication needs
            needs_auth = False
            security = route_info.get("security") or openapi_schema.get("security", [])
            if security:
                needs_auth = True
            if any(prefix in path for prefix in ["/admin", "/agent", "/user-itineraries"]):
                needs_auth = True
                
            if needs_auth:
                headers.append({
                    "key": "Authorization",
                    "value": "Bearer {{auth_token}}",
                    "type": "text",
                    "description": "Bearer token for authorization"
                })
            
            # Body payload parsing
            body_obj = None
            if "requestBody" in route_info:
                content = route_info["requestBody"].get("content", {})
                if "application/json" in content:
                    headers.append({
                        "key": "Content-Type",
                        "value": "application/json",
                        "type": "text"
                    })
                    body_schema = content["application/json"].get("schema", {})
                    resolved_payload = resolve_schema(body_schema)
                    body_obj = {
                        "mode": "raw",
                        "raw": json.dumps(resolved_payload, indent=2) if resolved_payload is not None else "{}",
                        "options": {
                            "raw": {
                                "language": "json"
                            }
                        }
                    }
                elif "multipart/form-data" in content:
                    form_schema = content["multipart/form-data"].get("schema", {})
                    form_params = []
                    if "properties" in form_schema:
                        for prop_name, prop_schema in form_schema["properties"].items():
                            prop_type = prop_schema.get("type", "string")
                            is_file = prop_schema.get("format") == "binary"
                            form_params.append({
                                "key": prop_name,
                                "value": "" if is_file else str(prop_schema.get("default", f"example_{prop_name}")),
                                "type": "file" if is_file else "text",
                                "description": prop_schema.get("description", "")
                            })
                    body_obj = {
                        "mode": "formdata",
                        "formdata": form_params
                    }
                elif "application/x-www-form-urlencoded" in content:
                    form_schema = content["application/x-www-form-urlencoded"].get("schema", {})
                    form_params = []
                    if "properties" in form_schema:
                        for prop_name, prop_schema in form_schema["properties"].items():
                            form_params.append({
                                "key": prop_name,
                                "value": str(prop_schema.get("default", f"example_{prop_name}")),
                                "type": "text",
                                "description": prop_schema.get("description", "")
                            })
                    body_obj = {
                        "mode": "urlencoded",
                        "urlencoded": form_params
                    }
            
            # Query and Path parameters
            query_params = []
            path_variables = []
            
            parameters = route_info.get("parameters", [])
            for param in parameters:
                p_name = param.get("name")
                p_in = param.get("in")
                p_desc = param.get("description", "")
                p_required = param.get("required", False)
                p_schema = param.get("schema", {})
                p_type = p_schema.get("type", "string")
                p_default = p_schema.get("default", "")
                
                p_val = str(p_default) if p_default != "" else f"<{p_type}>"
                if p_required:
                    p_val = f"example_{p_name}" if p_val == f"<{p_type}>" else p_val
                
                if p_in == "query":
                    query_params.append({
                        "key": p_name,
                        "value": p_val,
                        "description": f"{'(Required) ' if p_required else ''}{p_desc}",
                        "disabled": not p_required
                    })
                elif p_in == "path":
                    path_variables.append({
                        "key": p_name,
                        "value": p_val,
                        "description": p_desc
                    })
                elif p_in == "header":
                    headers.append({
                        "key": p_name,
                        "value": p_val,
                        "description": p_desc
                    })
            
            # URL Builder
            url_obj = {
                "raw": "{{base_url}}/" + "/".join(path_parts) + ("?" + "&".join([f"{q['key']}={q['value']}" for q in query_params if not q.get("disabled")]) if query_params else ""),
                "host": ["{{base_url}}"],
                "path": path_parts,
            }
            if query_params:
                url_obj["query"] = query_params
            if path_variables:
                url_obj["variable"] = path_variables
            
            request = {
                "method": method,
                "header": headers,
                "url": url_obj,
                "description": route_info.get("description", "")
            }
            if body_obj:
                request["body"] = body_obj
                
            item = {
                "name": req_name,
                "request": request,
                "response": []
            }
            
            folders[tag]["item"].append(item)
            
    collection = {
        "info": info,
        "item": list(folders.values()),
        "variable": [
            {
                "key": "base_url",
                "value": "http://localhost:8000",
                "type": "string"
            },
            {
                "key": "auth_token",
                "value": "YOUR_JWT_TOKEN",
                "type": "string"
            }
        ]
    }
    
    output_path = os.path.join(os.path.dirname(__file__), "Tour_SaaS_API.postman_collection.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(collection, f, indent=2)
        
    print(f"Successfully generated Postman collection with {total_endpoints} endpoints across {len(folders)} groups.")
    print(f"Saved to: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    generate_postman_collection()
