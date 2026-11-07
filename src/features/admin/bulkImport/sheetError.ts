/** A problem with the file itself. The message is plain English and safe to show. */
export class SheetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SheetError";
  }
}
