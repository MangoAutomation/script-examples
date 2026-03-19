#!/usr/bin/env python3
"""
Evaluate a Mango filestore script via the REST API.

Usage:
    python eval_script.py default/script-examples/clearCaches.js --token <token>
    python eval_script.py default/script-examples/clearCaches.js --username admin --password <pass>
"""

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request


def build_session_opener(base_url, username, password):
    """Login with username/password; returns an opener that carries the session cookie."""
    url = f"{base_url}/rest/latest/login"

    cookie_jar = urllib.request.HTTPCookieProcessor()
    opener = urllib.request.build_opener(cookie_jar)

    # GET to obtain the initial XSRF-TOKEN cookie (returns 405, that's fine)
    try:
        opener.open(urllib.request.Request(url, method="GET"))
    except urllib.error.HTTPError:
        pass

    csrf_token = None
    for cookie in cookie_jar.cookiejar:
        if cookie.name == "XSRF-TOKEN":
            csrf_token = cookie.value
            break

    payload = json.dumps({"username": username, "password": password}).encode()
    headers = {"Content-Type": "application/json"}
    if csrf_token:
        headers["X-XSRF-TOKEN"] = csrf_token

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with opener.open(req) as resp:
            resp.read()  # consume body; session cookie is now in cookie_jar
    except urllib.error.HTTPError as e:
        print(f"ERROR: Login failed ({e.code}): {e.read().decode()}", file=sys.stderr)
        sys.exit(1)

    # Refresh XSRF token for subsequent requests
    for cookie in cookie_jar.cookiejar:
        if cookie.name == "XSRF-TOKEN":
            opener._xsrf_token = cookie.value
            break

    return opener


def eval_script(base_url, script_path, token=None, opener=None,
                engine=None, body=None, roles=None, verbose=False):
    script_path = script_path.lstrip("/")
    url = f"{base_url}/rest/latest/script/eval-file-store/{script_path}"

    params = {}
    if engine:
        params["engineName"] = engine
    if roles:
        params["roles"] = roles
    if params:
        url += "?" + urllib.parse.urlencode(params)

    if body is None:
        request_body = b""
    elif isinstance(body, str):
        request_body = body.encode()
    else:
        request_body = body

    headers = {"Content-Type": "application/octet-stream"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    elif opener and hasattr(opener, "_xsrf_token"):
        headers["X-XSRF-TOKEN"] = opener._xsrf_token

    req = urllib.request.Request(url, data=request_body, headers=headers, method="POST")

    http_open = opener.open if opener else urllib.request.urlopen
    try:
        with http_open(req) as resp:
            if verbose:
                print(f"HTTP {resp.status}", file=sys.stderr)
                for k, v in resp.headers.items():
                    print(f"  {k}: {v}", file=sys.stderr)
            response_body = resp.read().decode()
            if response_body:
                print(response_body)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        if e.code == 401:
            print("ERROR: Authentication failed (401). Check your token or credentials.", file=sys.stderr)
        elif e.code == 403:
            print("ERROR: Permission denied (403). Your account may lack required roles.", file=sys.stderr)
        elif e.code == 404:
            print(f"ERROR: Script not found (404): {script_path}", file=sys.stderr)
        else:
            print(f"ERROR: HTTP {e.code}", file=sys.stderr)
        if error_body:
            print(error_body, file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate a Mango filestore script via the REST API."
    )
    parser.add_argument(
        "script_path",
        help="Filestore-relative path, e.g. default/script-examples/clearCaches.js",
    )
    parser.add_argument(
        "--url",
        default="http://localhost:8080",
        help="Mango base URL (default: http://localhost:8080)",
    )
    parser.add_argument("--token", help="Bearer token for authentication")
    parser.add_argument("--username", help="Username (logs in via session)")
    parser.add_argument("--password", help="Password (used with --username)")
    parser.add_argument("--engine", help="Script engine name (e.g. nashorn, graal.js)")
    parser.add_argument(
        "--body",
        help="Request body string, or @filename to read from a file",
    )
    parser.add_argument(
        "--roles",
        help="Comma-separated role XIDs to run the script with",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Print HTTP status and headers to stderr",
    )
    args = parser.parse_args()

    token = args.token
    opener = None

    if not token:
        if args.username and args.password:
            opener = build_session_opener(args.url, args.username, args.password)
        else:
            parser.error(
                "Authentication required. Provide --token or both --username and --password."
            )

    body = None
    if args.body:
        if args.body.startswith("@"):
            filepath = args.body[1:]
            try:
                with open(filepath, "rb") as f:
                    body = f.read()
            except OSError as e:
                print(f"ERROR: Could not read body file '{filepath}': {e}", file=sys.stderr)
                sys.exit(1)
        else:
            body = args.body

    eval_script(
        base_url=args.url,
        script_path=args.script_path,
        token=token,
        opener=opener,
        engine=args.engine,
        body=body,
        roles=args.roles,
        verbose=args.verbose,
    )


if __name__ == "__main__":
    main()
