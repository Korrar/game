// TDD Tests for IsoCamera — Isometric camera system
import { describe, it, expect } from "vitest";
import { IsoCamera } from "../IsoCamera.js";

describe("IsoCamera", () => {
  it("creates with default position at map center", () => {
    const cam = new IsoCamera();
    expect(cam.x).toBeDefined();
    expect(cam.y).toBeDefined();
  });

  it("creates with custom position", () => {
    const cam = new IsoCamera(100, 200);
    expect(cam.x).toBe(100);
    expect(cam.y).toBe(200);
  });

  it("pan moves camera by delta", () => {
    const cam = new IsoCamera(0, 0);
    cam.pan(50, 30);
    expect(cam.x).toBe(50);
    expect(cam.y).toBe(30);
  });

  it("pan accumulates", () => {
    const cam = new IsoCamera(0, 0);
    cam.pan(10, 20);
    cam.pan(30, 40);
    expect(cam.x).toBe(40);
    expect(cam.y).toBe(60);
  });

  it("setPosition sets absolute camera position", () => {
    const cam = new IsoCamera(0, 0);
    cam.setPosition(200, 300);
    expect(cam.x).toBe(200);
    expect(cam.y).toBe(300);
  });

  it("centerOnWorld centers camera on world coordinates", () => {
    const cam = new IsoCamera(0, 0);
    cam.centerOnWorld(20, 20);
    // Camera should be at the screen position of (20,20) in iso
    expect(typeof cam.x).toBe("number");
    expect(typeof cam.y).toBe("number");
  });

  it("clamps to bounds when configured", () => {
    const cam = new IsoCamera(0, 0);
    cam.setBounds(-500, -500, 500, 500);
    cam.setPosition(9999, 9999);
    expect(cam.x).toBeLessThanOrEqual(500);
    expect(cam.y).toBeLessThanOrEqual(500);
  });

  it("clamps negative direction too", () => {
    const cam = new IsoCamera(0, 0);
    cam.setBounds(-100, -100, 100, 100);
    cam.setPosition(-9999, -9999);
    expect(cam.x).toBeGreaterThanOrEqual(-100);
    expect(cam.y).toBeGreaterThanOrEqual(-100);
  });

  it("smooth follow lerps toward target", () => {
    const cam = new IsoCamera(0, 0);
    cam.followTarget(100, 100, 0.5);
    // Should move partway toward target
    expect(cam.x).toBeGreaterThan(0);
    expect(cam.x).toBeLessThan(100);
    expect(cam.y).toBeGreaterThan(0);
    expect(cam.y).toBeLessThan(100);
  });

  it("follow with factor 1 jumps directly to target", () => {
    const cam = new IsoCamera(0, 0);
    cam.followTarget(100, 100, 1.0);
    expect(cam.x).toBeCloseTo(100, 2);
    expect(cam.y).toBeCloseTo(100, 2);
  });

  it("getScreenOffset returns camera position for rendering", () => {
    const cam = new IsoCamera(150, 80);
    const offset = cam.getScreenOffset();
    // Without shake, offset equals raw position
    expect(offset.x).toBe(150);
    expect(offset.y).toBe(80);
  });

  // ─── ZOOM TESTS ───

  it("initializes with default zoom of 1.0", () => {
    const cam = new IsoCamera();
    expect(cam.getZoom()).toBe(1.0);
  });

  it("setZoom changes target zoom", () => {
    const cam = new IsoCamera();
    cam.setZoom(1.5);
    cam.update();
    // Should start interpolating toward 1.5
    expect(cam.getZoom()).toBeGreaterThan(1.0);
  });

  it("setZoom clamps to min/max", () => {
    const cam = new IsoCamera();
    cam.setZoom(0.01); // below minimum
    // After many updates, zoom should not go below min
    for (let i = 0; i < 200; i++) cam.update();
    expect(cam.getZoom()).toBeGreaterThanOrEqual(0.5);

    cam.setZoom(10.0); // above maximum
    for (let i = 0; i < 200; i++) cam.update();
    expect(cam.getZoom()).toBeLessThanOrEqual(2.0);
  });

  it("resetZoom returns to default", () => {
    const cam = new IsoCamera();
    cam.setZoom(1.8);
    for (let i = 0; i < 200; i++) cam.update();
    cam.resetZoom();
    for (let i = 0; i < 200; i++) cam.update();
    expect(cam.getZoom()).toBeCloseTo(1.0, 2);
  });

  // ─── FOLLOW TESTS ───

  it("startFollow enables camera tracking", () => {
    const cam = new IsoCamera(0, 0);
    cam.setBounds(-9999, -9999, 9999, 9999);
    const startX = cam.x;
    cam.startFollow(20, 20);
    for (let i = 0; i < 50; i++) cam.update();
    // Camera should have moved toward the target
    expect(cam.x !== startX || cam.y !== startX).toBe(true);
  });

  it("stopFollow freezes camera", () => {
    const cam = new IsoCamera(0, 0);
    cam.setBounds(-9999, -9999, 9999, 9999);
    cam.startFollow(20, 20);
    for (let i = 0; i < 20; i++) cam.update();
    cam.stopFollow();
    const posAfterStop = { x: cam.x, y: cam.y };
    for (let i = 0; i < 20; i++) cam.update();
    // Should not move after stopping (no shake active)
    expect(cam.x).toBeCloseTo(posAfterStop.x, 2);
    expect(cam.y).toBeCloseTo(posAfterStop.y, 2);
  });

  // ─── SCREEN SHAKE TESTS ───

  it("shake offsets getScreenOffset from raw position", () => {
    const cam = new IsoCamera(100, 100);
    cam.setBounds(-9999, -9999, 9999, 9999);
    cam.shake(20);
    cam.update();
    const offset = cam.getScreenOffset();
    const raw = cam.getRawPosition();
    // Shake should add some offset
    const hasDrift = offset.x !== raw.x || offset.y !== raw.y;
    expect(hasDrift).toBe(true);
  });

  it("shake decays over time", () => {
    const cam = new IsoCamera(100, 100);
    cam.setBounds(-9999, -9999, 9999, 9999);
    cam.shake(10);
    // After many updates, shake should be gone
    for (let i = 0; i < 100; i++) cam.update();
    const offset = cam.getScreenOffset();
    const raw = cam.getRawPosition();
    expect(offset.x).toBeCloseTo(raw.x, 0);
    expect(offset.y).toBeCloseTo(raw.y, 0);
  });

  // ─── DYNAMIC MAP SIZE ───

  it("setMapSize updates camera bounds", () => {
    const cam = new IsoCamera();
    cam.setMapSize(20, 20); // smaller arena
    // Should not throw
    expect(cam._bounds).toBeDefined();
    expect(cam._bounds.maxX).toBeLessThan(9999);
  });

  // ─── VISIBILITY CULLING ───

  it("isVisible returns true for on-screen objects", () => {
    const cam = new IsoCamera();
    expect(cam.isVisible(640, 360, 50, 50)).toBe(true);
  });

  it("isVisible returns false for far off-screen objects", () => {
    const cam = new IsoCamera();
    expect(cam.isVisible(-500, -500, 10, 10)).toBe(false);
    expect(cam.isVisible(2000, 2000, 10, 10)).toBe(false);
  });
});
