import { getProductById } from "../src/services/productService";

describe("productService getProductById", () => {
  it("returns product when found", async () => {
    const product = await getProductById("1");
    expect(product).not.toBeNull();
    expect(product?.id).toBe("1");
  });

  it("returns null when not found", async () => {
    const product = await getProductById("non-existing-id");
    expect(product).toBeNull();
  });
});
