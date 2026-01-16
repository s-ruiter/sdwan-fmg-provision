from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests
import urllib3
import json

# Disable SSL warnings for self-signed certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = FastAPI()

class LoginRequest(BaseModel):
    ip: str
    username: str
    password: str

@app.post("/api/login")
async def login(login_data: LoginRequest):
    url = f"https://{login_data.ip}/jsonrpc"
    payload = {
        "session": 1,
        "id": 1,
        "method": "exec",
        "params": [
            {
                "url": "sys/login/user",
                "data": [
                    {
                        "user": login_data.username,
                        "passwd": login_data.password
                    }
                ]
            }
        ]
    }

    try:
        response = requests.post(
            url, 
            json=payload, 
            verify=False,
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        # Check if the response contains necessary data
        # Based on postman: "postman.setEnvironmentVariable('session',data['session']);"
        if 'session' in data:
            return {"session": data['session'], "message": "Login successful"}
        else:
            # Try to parse error from result
            error_msg = "Unknown login failure"
            if 'result' in data and len(data['result']) > 0:
                status = data['result'][0].get('status', {})
                error_msg = status.get('message', error_msg)
            raise HTTPException(status_code=401, detail=error_msg)

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/collection")
async def get_collection():
    try:
        with open("postman_collection.json", "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/collection")
async def update_collection(collection: dict):
    try:
        with open("postman_collection.json", "w") as f:
            json.dump(collection, f, indent=4)
        return {"message": "Collection updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from typing import Optional

class ProvisionRequest(BaseModel):
    ip: str
    session: str
    adom: str
    dns_primary: str
    dns_secondary: str
    faz_target_ip: str
    faz_target_sn: str
    corp_lan_subnet: str
    corp_lan_netmask: str
    scope: str
    step_name: Optional[str] = None

def substitute_variables(content: str, variables: dict) -> str:
    for key, value in variables.items():
        # Handle $(variable)
        content = content.replace(f"$({key})", str(value))
        # Handle {{variable}}
        content = content.replace(f"{{{{{key}}}}}", str(value))
    return content

@app.post("/api/provision")
async def run_provision(req: ProvisionRequest):
    try:
        with open("postman_collection.json", "r") as f:
            collection = json.load(f)
        
        items = collection.get("item", [])
        
        # Filter items based on scope
        if req.scope == "single" and req.step_name:
            items = [item for item in items if item["name"] == req.step_name]
            if not items:
                raise HTTPException(status_code=404, detail="Step not found")
        
        # Prepare variables
        variables = {
            "session": req.session,
            "adom": req.adom,
            "dns_primary": req.dns_primary,
            "dns_secondary": req.dns_secondary,
            "faz_target_ip": req.faz_target_ip,
            "faz_target_sn": req.faz_target_sn,
            "corp_lan_subnet": req.corp_lan_subnet,
            "corp_lan_netmask": req.corp_lan_netmask,
        }

        results = []
        base_url = f"https://{req.ip}/jsonrpc"

        for item in items:
            # Skip if no request body
            if "request" not in item:
                continue

            # Skip Login step as we already have a session and don't have credentials here
            if item["name"] == "Login": continue 

            # Get raw body
            raw_body = item["request"].get("body", {}).get("raw", "")
            
            # Substitute variables
            processed_body = substitute_variables(raw_body, variables)
            
            # Parse JSON
            try:
                payload = json.loads(processed_body)
            except json.JSONDecodeError:
                results.append({"name": item["name"], "status": "error", "message": "Invalid JSON body after substitution"})
                continue

            # Execute
            try:
                resp = requests.post(base_url, json=payload, verify=False, timeout=30)
                json_resp = resp.json()
                
                # Parse FMG Status
                status = "success"
                msg = "OK"
                
                # FMG JSON-RPC typically returns result list
                if "result" in json_resp and isinstance(json_resp["result"], list) and len(json_resp["result"]) > 0:
                    first_res = json_resp["result"][0]
                    # Check status object
                    if "status" in first_res:
                        code = first_res["status"].get("code")
                        message = first_res["status"].get("message", "")
                        
                        if code != 0:
                            status = "error"
                            msg = f"FMG Error ({code}): {message}"
                        else:
                            msg = message
                    else:
                        # Sometimes result contains data directly? Unlikely in FMG API standard 
                        pass
                elif "error" in json_resp:
                     # JSON-RPC error level
                     status = "error"
                     msg = str(json_resp["error"])
                else:
                    status = "error"
                    msg = "Invalid FMG response format"

                results.append({
                    "name": item["name"], 
                    "status": status, 
                    "message": msg,
                    "response": json_resp
                })
            except Exception as e:
                results.append({"name": item["name"], "status": "error", "message": str(e)})

        return {"results": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
