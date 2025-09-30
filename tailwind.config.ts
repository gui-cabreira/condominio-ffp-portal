import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'montserrat': ['Open Sans', 'sans-serif'],
				'playfair': ['Lora', 'serif'],
				'sans': ['Open Sans', 'sans-serif']
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				ffp: {
					navy: '#1E2C54',
					gold: '#b37834',
					'navy-light': '#2d3a6e',
					'navy-dark': '#151f45',
					'gold-light': '#c5884a',
					'gold-dark': '#9a6628',
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0',
						opacity: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)',
						opacity: '1'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)',
						opacity: '1'
					},
					to: {
						height: '0',
						opacity: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px) scale(0.95)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0) scale(1)'
					}
				},
				'fade-out': {
					'0%': {
						opacity: '1',
						transform: 'translateY(0) scale(1)'
					},
					'100%': {
						opacity: '0',
						transform: 'translateY(10px) scale(0.95)'
					}
				},
				'slide-in-left': {
					'0%': {
						opacity: '0',
						transform: 'translateX(-100px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'slide-in-right': {
					'0%': {
						opacity: '0',
						transform: 'translateX(100px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'slide-in-bottom': {
					'0%': {
						opacity: '0',
						transform: 'translateY(60px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in-top': {
					'0%': {
						opacity: '0',
						transform: 'translateY(-60px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'scale-in': {
					'0%': {
						transform: 'scale(0.8)',
						opacity: '0'
					},
					'50%': {
						transform: 'scale(1.05)',
						opacity: '0.8'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				},
				'scale-out': {
					'0%': {
						transform: 'scale(1)',
						opacity: '1'
					},
					'100%': {
						transform: 'scale(0.9)',
						opacity: '0'
					}
				},
				'bounce-subtle': {
					'0%, 100%': {
						transform: 'translateY(0)'
					},
					'50%': {
						transform: 'translateY(-10px)'
					}
				},
				'float-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(60px) scale(0.9) rotateY(10deg)'
					},
					'60%': {
						opacity: '0.8',
						transform: 'translateY(-10px) scale(1.02) rotateY(-2deg)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0) scale(1) rotateY(0deg)'
					}
				},
				'photo-reveal': {
					'0%': {
						opacity: '0',
						transform: 'scale(1.2) rotate(5deg)',
						filter: 'blur(10px) brightness(0.5)'
					},
					'50%': {
						opacity: '0.7',
						transform: 'scale(1.05) rotate(-1deg)',
						filter: 'blur(2px) brightness(0.8)'
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1) rotate(0deg)',
						filter: 'blur(0px) brightness(1)'
					}
				},
				'logo-glow': {
					'0%': {
						opacity: '0',
						transform: 'scale(0.8)',
						filter: 'blur(4px)'
					},
					'50%': {
						opacity: '0.8',
						transform: 'scale(1.1)',
						filter: 'blur(0px)'
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)',
						filter: 'blur(0px)'
					}
				},
				'shimmer': {
					'0%': {
						backgroundPosition: '-1000px 0'
					},
					'100%': {
						backgroundPosition: '1000px 0'
					}
				},
				'glow-pulse': {
					'0%, 100%': {
						boxShadow: '0 0 20px rgba(179, 120, 52, 0.3)'
					},
					'50%': {
						boxShadow: '0 0 40px rgba(179, 120, 52, 0.6)'
					}
				},
				'spin-slow': {
					'0%': { transform: 'rotate(0deg)' },
					'100%': { transform: 'rotate(360deg)' }
				},
				'zoom-in-out': {
					'0%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.08)' },
					'100%': { transform: 'scale(1)' }
				},
				'wiggle': {
					'0%, 100%': { transform: 'rotate(-3deg)' },
					'50%': { transform: 'rotate(3deg)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'accordion-up': 'accordion-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'fade-in': 'fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
				'fade-out': 'fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'slide-in-left': 'slide-in-left 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
				'slide-in-right': 'slide-in-right 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
				'slide-in-bottom': 'slide-in-bottom 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
				'slide-in-top': 'slide-in-top 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
				'scale-in': 'scale-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
				'scale-out': 'scale-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
				'float-up': 'float-up 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
				'photo-reveal': 'photo-reveal 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
				'logo-glow': 'logo-glow 2s ease-out forwards',
				'shimmer': 'shimmer 3s linear infinite',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'spin-slow': 'spin-slow 20s linear infinite',
				'zoom-in-out': 'zoom-in-out 12s ease-in-out infinite',
				'wiggle': 'wiggle 1s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
