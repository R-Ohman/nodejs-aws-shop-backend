declare module "csv-parser" {
  import { Transform } from "stream";

  function csvParser(options?: Record<string, unknown>): Transform;

  export default csvParser;
}