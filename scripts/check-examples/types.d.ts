/** One TypeScript Markdown fence and its original source position for useful compiler diagnostics. */
export interface DocumentationExample {
    fileName: string;
    source: string;
    markdownFile: string;
    markdown: string;
    offset: number;
}
