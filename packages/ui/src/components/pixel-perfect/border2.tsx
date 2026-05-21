const Border2 = () => (
  <div className="absolute inset-0 pointer-events-none z-10">
    {/* Top left corner */}
    <span className="absolute -top-px -left-px block size-4 border-t border-l border-muted-foreground/40" />
    {/* Top right corner */}
    <span className="absolute -top-px -right-px block size-4 border-t border-r border-muted-foreground/40" />
    {/* Bottom left corner */}
    <span className="absolute -bottom-px -left-px block size-4 border-b border-l border-muted-foreground/40" />
    {/* Bottom right corner */}
    <span className="absolute -bottom-px -right-px block size-4 border-b border-r border-muted-foreground/40" />
  </div>
);

export { Border2 };
