export default function Button({ children, variant = 'primary', onClick, type = 'button', className = '' }) {
  const base = 'px-4 py-2 rounded-lg font-medium transition-colors text-sm';
  const variants = {
    primary: 'bg-accent text-bg hover:opacity-90',
    secondary: 'bg-surface border border-border text-text-primary hover:border-accent',
    danger: 'bg-accent-danger text-white hover:opacity-90',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}