"""Playwright 스크린샷 캡처 - 현재 디자인 상태 진단용"""
from playwright.sync_api import sync_playwright
import os

BASE = "http://localhost:8000"
OUT = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUT, exist_ok=True)


def capture_all():
    with sync_playwright() as p:
        # Desktop
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(1500)

        # 시뮬레이션 탭 - 6개 케이스
        for case_num in range(1, 7):
            btn = page.locator(f'.case-btn[data-case="{case_num}"]')
            if btn.count() > 0:
                btn.click()
                page.wait_for_timeout(800)
            page.screenshot(path=os.path.join(OUT, f"desktop_case{case_num}.png"), full_page=True)
            print(f"  Captured: desktop_case{case_num}.png")

        # War Game 탭
        game_tab = page.locator('.tab-btn[data-tab="game"]')
        if game_tab.count() > 0:
            game_tab.click()
            page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUT, "desktop_wargame.png"), full_page=True)
        print("  Captured: desktop_wargame.png")

        # 학습 탭
        learn_tab = page.locator('.tab-btn[data-tab="learn"]')
        if learn_tab.count() > 0:
            learn_tab.click()
            page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUT, "desktop_learn.png"), full_page=True)
        print("  Captured: desktop_learn.png")

        # AI 채팅 패널 열기
        sim_tab = page.locator('.tab-btn[data-tab="sim"]')
        if sim_tab.count() > 0:
            sim_tab.click()
            page.wait_for_timeout(300)
        chat_toggle = page.locator(".chat-toggle")
        if chat_toggle.count() > 0:
            chat_toggle.click()
            page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUT, "desktop_chat.png"), full_page=True)
        print("  Captured: desktop_chat.png")

        browser.close()

        # Mobile (iPhone 14 Pro)
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 375, "height": 812}, is_mobile=True)
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(1500)

        page.screenshot(path=os.path.join(OUT, "mobile_sim.png"), full_page=True)
        print("  Captured: mobile_sim.png")

        game_tab = page.locator('.tab-btn[data-tab="game"]')
        if game_tab.count() > 0:
            game_tab.click()
            page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUT, "mobile_wargame.png"), full_page=True)
        print("  Captured: mobile_wargame.png")

        learn_tab = page.locator('.tab-btn[data-tab="learn"]')
        if learn_tab.count() > 0:
            learn_tab.click()
            page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUT, "mobile_learn.png"), full_page=True)
        print("  Captured: mobile_learn.png")

        browser.close()


if __name__ == "__main__":
    print("=== Before Screenshots ===")
    capture_all()
    print(f"\nAll screenshots saved to: {OUT}")
