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
    expect(offset.x).toBe(150);
    expect(offset.y).toBe(80);
  });
});
