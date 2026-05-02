import { getAllProducts } from "../src/services/productService";

describe("productService getAllProducts", () => {
  it("returns an array of products", async () => {
    const list = await getAllProducts();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });
});
