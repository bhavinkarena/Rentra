"""Read-only anonymous browser checks against a running production build.

Usage: python scripts/performance/navigation-smoke.py
Requires Python Playwright and Chrome. Set PERF_WEB_URL / CHROME to override.
Never logs in, seeds a database, or changes account records.
"""

import os
from playwright.sync_api import sync_playwright, expect

web = os.environ.get("PERF_WEB_URL", "http://localhost:3119")
chrome = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=chrome)
    context = browser.new_context()
    page = context.new_page()
    documents, actions, errors = [], [], []
    page.on("request", lambda request: documents.append(request.url) if request.resource_type == "document" else None)
    page.on("request", lambda request: actions.append(request.url) if request.headers.get("next-action") else None)
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        page.goto(web + "/help", wait_until="networkidle")
        page.evaluate("window.__performanceSmoke = 'same-document'")
        initial_documents, initial_actions = len(documents), len(actions)
        page.get_by_role("searchbox", name="Search help").fill("cancellation")
        page.get_by_role("button", name="Search help", exact=True).click()
        page.wait_for_url("**/help?q=cancellation")
        expect(page.get_by_role("heading", name="matching answers", exact=False)).to_be_visible()
        assert page.evaluate("window.__performanceSmoke") == "same-document"
        assert len(documents) == initial_documents, "Help search reloaded the document"
        print("PASS: help GET form uses client navigation")

        # Cross-path navigation within the marketing layout must reuse saved state.
        page.locator('footer a[href="/search"]').click()
        page.wait_for_url("**/search")
        expect(page.get_by_role("heading", name="Find a place", exact=True)).to_be_visible()
        page.wait_for_load_state("networkidle")
        assert len(documents) == initial_documents, "Link reloaded the document"
        assert len(actions) == initial_actions, "Path navigation reloaded saved identity"
        print("PASS: shared customer provider does not reload on pathname changes")

        page.locator('#discovery-filters input[name="q"]').fill("farmhouse")
        page.get_by_role("button", name="Show places", exact=True).click()
        page.wait_for_url("**/search?**q=farmhouse**")
        expect(page.locator('#discovery-filters input[name="q"]')).to_have_value("farmhouse")
        assert len(documents) == initial_documents, "Discovery filter reloaded the document"
        print("PASS: discovery filters use client navigation")
        page.get_by_role("link", name="Clear all", exact=True).click()
        page.wait_for_url("**/search")
        expect(page.locator('#discovery-filters input[name="q"]')).to_have_value("")
        page.go_back()
        page.wait_for_url("**/search?**q=farmhouse**")
        expect(page.locator('#discovery-filters input[name="q"]')).to_have_value("farmhouse")
        print("PASS: clear and browser Back restore filter values")
        initial_actions = len(actions)
        page.goto(web + "/partner/login", wait_until="networkidle")
        assert len(actions) == initial_actions, "Partner entry mounted saved-place effects"
        print("PASS: partner entry does not load customer saved-state actions")
        assert not errors, errors
        print("PASS: no browser runtime/hydration errors")
    finally:
        context.close()
        browser.close()
