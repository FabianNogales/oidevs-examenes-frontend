---
name: flat-design-2
description: Web and App implementation guide for Flat Design 2.0 (Semi-Flat) with Poppins typography and a blue/burgundy palette. Trigger when the user wants flat design with subtle shadows and improved usability.
date_added: "2026-06-17"
date_updated: "2026-11-06"
risk: safe
source: self
source_type: self
---

# Flat Design 2.0 (Semi-Flat)

> "Flat aesthetics, but with subtle hints of physics to communicate interactability."

## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Mostly Flat**: The primary aesthetic remains 2D and solid.
2. **Subtle Elevation**: Use extremely soft, large-spread shadows strictly to indicate interactable elements (buttons, floating action buttons) or layers (modals).
3. **Micro-Gradients**: Occasional, barely noticeable linear gradients (e.g. `#F9FCFF` → `#EAF3FF`) to prevent large surfaces from feeling dead.
4. **Color has a role**: Blue = primary action. Burgundy = secondary/active/focus state. Never mix the two roles.

---

## Typography

**Single family: Poppins** (all text, no exceptions). Load weights 400, 600 and 800.

| Token | Weight | Size | Line height | Usage |
|---|---|---|---|---|
| H1 | ExtraBold (800) | 40 | 40 | Page / hero titles |
| H2 | SemiBold (600) | 24 | 30 | Section titles |
| H3 | SemiBold (600) | 20 | 25 | Card / subsection titles |
| Body | Regular (400) | 16 | 24 | General text |
| Small | Regular (400) | 14 | 21 | Descriptions, captions, helper text |
| Interactive | SemiBold (600) | 14 | 16 | Buttons, tabs, filters, links, any clickable element |

Rules:
- Sizes and line heights are in px (web) / pt (iOS) / sp (Android, Flutter, RN). Do not scale them ad hoc.
- Do not introduce other weights (no Light, Medium, Bold) or other families.
- Primary text uses `--text-primary`; descriptions (Small) may use `--text-secondary`.

## Color Palette

### Core
| Role | Token | Hex |
|---|---|---|
| Text primary | `--text-primary` | `#172554` |
| Text secondary / card shadows / borders | `--text-secondary` | `#68778F` |
| Background primary (page) | `--bg-primary` | `#EAF3FF` |
| Background secondary (sections, sidebars) | `--bg-secondary` | `#DFF1FF` |
| Background tertiary (cards, inputs, modals) | `--bg-tertiary` | `#F9FCFF` |

### Actions
| Role | Token | Hex |
|---|---|---|
| Button primary | `--btn-primary` | `#2563EB` |
| Button secondary (hover animations, active filters, tabs, focused elements) | `--btn-secondary` | `#8B1E3F` |
| Secondary complement | `--btn-secondary-accent` | `#D67A8C` |
| Secondary complement, lightest background | `--btn-secondary-soft` | `#F7E9ED` |

### Alerts (UI standard) — solid / soft background
| State | Solid | Soft background |
|---|---|---|
| Destructive | `#D32F2F` | `#FCD2D2` |
| Success | `#2E7D32` | `#C2F2C4` |
| Alert (warning) | `#FFC107` | `#FFF1C8` |

### Usage guidance
- **Layering**: page `--bg-primary` → sections `--bg-secondary` → cards/inputs `--bg-tertiary`. Cards sit on the page as the lightest surface.
- **Borders**: 1px `--text-secondary` at ~20–30% opacity (e.g. `rgba(104,119,143,0.25)`).
- **Shadows**: always tinted with `#68778F` (`rgba(104,119,143, …)`), never pure black.
- **Primary button**: bg `#2563EB`, text white. Shadow tinted blue at low opacity.
- **Secondary states** (`#8B1E3F`): active filter chip, selected tab indicator, focus ring, hover accents. Inactive-hover surfaces use `#F7E9ED` with `#D67A8C` borders/icons; active ones use `#8B1E3F` with white text.
- **Alerts**: soft background + solid color for icon, border (1px) and title. Message text stays `#172554`.
- **Accessibility**:
  - Text on the yellow Alert (`#FFC107`) must be `#172554`, never white.
  - `#68778F` on `#F9FCFF` is borderline for AA at 14px; use it for descriptions only, and use `#172554` when the text carries essential information.
  - White on `#2563EB`, `#8B1E3F`, `#D32F2F` and `#2E7D32` passes AA.

---

## Web Implementation

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap');

:root {
  /* Typography */
  --font-family: 'Poppins', sans-serif;

  /* Colors */
  --text-primary: #172554;
  --text-secondary: #68778F;
  --bg-primary: #EAF3FF;
  --bg-secondary: #DFF1FF;
  --bg-tertiary: #F9FCFF;
  --btn-primary: #2563EB;
  --btn-secondary: #8B1E3F;
  --btn-secondary-accent: #D67A8C;
  --btn-secondary-soft: #F7E9ED;

  /* Alerts */
  --destructive: #D32F2F;  --destructive-soft: #FCD2D2;
  --success: #2E7D32;      --success-soft: #C2F2C4;
  --warning: #FFC107;      --warning-soft: #FFF1C8;

  /* Tinted shadows & borders (from text-secondary) */
  --shadow-color: rgba(104, 119, 143, 0.12);
  --shadow-color-hover: rgba(104, 119, 143, 0.20);
  --border-color: rgba(104, 119, 143, 0.25);
}

body {
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 16px;
  line-height: 24px;
  color: var(--text-primary);
  background-color: var(--bg-primary);
}

h1 { font-weight: 800; font-size: 40px; line-height: 40px; }
h2 { font-weight: 600; font-size: 24px; line-height: 30px; }
h3 { font-weight: 600; font-size: 20px; line-height: 25px; }
h1, h2, h3 { color: var(--text-primary); margin: 0; }

.text-small { font-size: 14px; line-height: 21px; color: var(--text-secondary); }

/* Interactive elements */
button, .tab, .chip, .link-action {
  font-family: var(--font-family);
  font-weight: 600;
  font-size: 14px;
  line-height: 16px;
}

.flat2-card {
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 10px 30px var(--shadow-color);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}
.flat2-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px var(--shadow-color-hover);
}

/* Primary button */
.flat2-btn {
  background: var(--btn-primary);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 12px 24px;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}
.flat2-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.30); }
.flat2-btn:active { transform: scale(0.98); }
.flat2-btn:focus-visible { outline: 2px solid var(--btn-secondary); outline-offset: 2px; }

/* Secondary button / chip / tab */
.flat2-btn-secondary {
  background: var(--bg-tertiary);
  color: var(--btn-secondary);
  border: 1px solid var(--btn-secondary-accent);
  border-radius: 4px;
  padding: 12px 24px;
  transition: background 0.2s ease, color 0.2s ease;
  cursor: pointer;
}
.flat2-btn-secondary:hover { background: var(--btn-secondary-soft); }
.flat2-btn-secondary.is-active,
.chip.is-active,
.tab.is-active { background: var(--btn-secondary); color: #fff; border-color: var(--btn-secondary); }
.tab { border-bottom: 2px solid transparent; }
.tab.is-active { background: transparent; color: var(--btn-secondary); border-bottom-color: var(--btn-secondary); }

/* Inputs */
.flat2-input {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 12px 16px;
  font: 400 16px/24px var(--font-family);
  color: var(--text-primary);
}
.flat2-input:focus { outline: none; border-color: var(--btn-secondary); box-shadow: 0 0 0 3px var(--btn-secondary-soft); }

/* Alerts */
.alert { border: 1px solid; border-radius: 8px; padding: 16px; color: var(--text-primary); font-size: 14px; line-height: 21px; }
.alert-destructive { background: var(--destructive-soft); border-color: var(--destructive); }
.alert-success     { background: var(--success-soft);     border-color: var(--success); }
.alert-warning     { background: var(--warning-soft);     border-color: var(--warning); }
```

---

## App Implementation

> Add Poppins (Regular, SemiBold, ExtraBold) as bundled font assets in every platform. Use the exact PostScript names below.

### SwiftUI
```swift
extension Color {
    static let textPrimary    = Color(hex: 0x172554)
    static let textSecondary  = Color(hex: 0x68778F)
    static let bgPrimary      = Color(hex: 0xEAF3FF)
    static let bgSecondary    = Color(hex: 0xDFF1FF)
    static let bgTertiary     = Color(hex: 0xF9FCFF)
    static let btnPrimary     = Color(hex: 0x2563EB)
    static let btnSecondary   = Color(hex: 0x8B1E3F)
    static let btnSecondaryAccent = Color(hex: 0xD67A8C)
    static let btnSecondarySoft   = Color(hex: 0xF7E9ED)
    static let destructive = Color(hex: 0xD32F2F), destructiveSoft = Color(hex: 0xFCD2D2)
    static let success     = Color(hex: 0x2E7D32), successSoft     = Color(hex: 0xC2F2C4)
    static let warning     = Color(hex: 0xFFC107), warningSoft     = Color(hex: 0xFFF1C8)

    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255)
    }
}

extension Font {
    static let h1          = Font.custom("Poppins-ExtraBold", size: 40)
    static let h2          = Font.custom("Poppins-SemiBold",  size: 24)
    static let h3          = Font.custom("Poppins-SemiBold",  size: 20)
    static let bodyText    = Font.custom("Poppins-Regular",   size: 16)
    static let smallText   = Font.custom("Poppins-Regular",   size: 14)
    static let interactive = Font.custom("Poppins-SemiBold",  size: 14)
}

// Line height = target - font natural line height; apply via lineSpacing.
// Poppins natural line height ≈ 1.5 × size, so adjust per token:
//   H1 40/40 → .lineSpacing(-20)   H2 24/30 → .lineSpacing(-6)
//   H3 20/25 → .lineSpacing(-5)    Body 16/24 → .lineSpacing(0)
//   Small 14/21 → .lineSpacing(0)  Interactive 14/16 → .lineSpacing(-5)
// Verify visually on device; fine-tune per OS version.

struct SemiFlatCard: View {
    @State private var isPressed = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Semi-Flat Card").font(.h3).foregroundColor(.textPrimary)
            Text("Flat aesthetic with just enough depth to hint at interactivity.")
                .font(.smallText).foregroundColor(.textSecondary)
        }
        .padding(24)
        .background(Color.bgTertiary)
        .cornerRadius(8)
        .overlay(RoundedRectangle(cornerRadius: 8)
            .stroke(Color.textSecondary.opacity(0.25), lineWidth: 1))
        // Tinted shadow from #68778F
        .shadow(color: Color.textSecondary.opacity(0.12), radius: 12, x: 0, y: 4)
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.easeOut(duration: 0.2), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { isPressed = $0 }, perform: {})
    }
}

struct SemiFlatButton: View {
    var body: some View {
        Button(action: {}) {
            Text("Continue")
                .font(.interactive)
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(Color.btnPrimary)
                .cornerRadius(4)
                .shadow(color: Color.btnPrimary.opacity(0.25), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
    }
}
```
- Shadow color is always tinted (`textSecondary` for cards, `btnPrimary` for primary buttons).
- Use `radius: 10...16` with `opacity: 0.08...0.14` — if the shadow is immediately noticeable, it is too heavy.
- Secondary / active / focused states use `btnSecondary`; hover/pressed-soft surfaces use `btnSecondarySoft`.

### Flutter
```dart
class AppColors {
  static const textPrimary = Color(0xFF172554);
  static const textSecondary = Color(0xFF68778F);
  static const bgPrimary = Color(0xFFEAF3FF);
  static const bgSecondary = Color(0xFFDFF1FF);
  static const bgTertiary = Color(0xFFF9FCFF);
  static const btnPrimary = Color(0xFF2563EB);
  static const btnSecondary = Color(0xFF8B1E3F);
  static const btnSecondaryAccent = Color(0xFFD67A8C);
  static const btnSecondarySoft = Color(0xFFF7E9ED);
  static const destructive = Color(0xFFD32F2F), destructiveSoft = Color(0xFFFCD2D2);
  static const success = Color(0xFF2E7D32),     successSoft = Color(0xFFC2F2C4);
  static const warning = Color(0xFFFFC107),     warningSoft = Color(0xFFFFF1C8);
}

// pubspec.yaml: declare family "Poppins" with weights 400, 600, 800.
// height = lineHeight / fontSize
class AppText {
  static const h1 = TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w800, fontSize: 40, height: 40 / 40, color: AppColors.textPrimary);
  static const h2 = TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 24, height: 30 / 24, color: AppColors.textPrimary);
  static const h3 = TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 20, height: 25 / 20, color: AppColors.textPrimary);
  static const body = TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w400, fontSize: 16, height: 24 / 16, color: AppColors.textPrimary);
  static const small = TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w400, fontSize: 14, height: 21 / 14, color: AppColors.textSecondary);
  static const interactive = TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 14, height: 16 / 14);
}

class SemiFlatCard extends StatelessWidget {
  const SemiFlatCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.bgTertiary,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.textSecondary.withOpacity(0.25)),
        boxShadow: [
          BoxShadow(
            color: AppColors.textSecondary.withOpacity(0.12),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Semi-Flat Card', style: AppText.h3),
          const SizedBox(height: 16),
          const Text('Flat aesthetic with just enough depth to hint at interactivity.', style: AppText.small),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              elevation: 2, // 1–4 max, never above 6
              shadowColor: AppColors.btnPrimary.withOpacity(0.4),
              backgroundColor: AppColors.btnPrimary,
              foregroundColor: Colors.white,
              textStyle: AppText.interactive,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: const Text('Continue'),
          ),
        ],
      ),
    );
  }
}
```
- Use `elevation: 1` to `4`. Never exceed `6`.
- Focus / active / selected states use `AppColors.btnSecondary`; hover/soft surfaces `btnSecondarySoft`.
- Use `InkWell` for ripple with `btnSecondarySoft` as `splashColor`.

### React Native
```jsx
// Load Poppins via expo-font / react-native assets.
// Font family names per weight (RN does not map fontWeight for custom fonts):
const fonts = {
  regular: 'Poppins-Regular',
  semibold: 'Poppins-SemiBold',
  extrabold: 'Poppins-ExtraBold',
};

const colors = {
  textPrimary: '#172554', textSecondary: '#68778F',
  bgPrimary: '#EAF3FF', bgSecondary: '#DFF1FF', bgTertiary: '#F9FCFF',
  btnPrimary: '#2563EB', btnSecondary: '#8B1E3F',
  btnSecondaryAccent: '#D67A8C', btnSecondarySoft: '#F7E9ED',
  destructive: '#D32F2F', destructiveSoft: '#FCD2D2',
  success: '#2E7D32', successSoft: '#C2F2C4',
  warning: '#FFC107', warningSoft: '#FFF1C8',
};

const type = {
  h1: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 40, color: colors.textPrimary },
  h2: { fontFamily: fonts.semibold,  fontSize: 24, lineHeight: 30, color: colors.textPrimary },
  h3: { fontFamily: fonts.semibold,  fontSize: 20, lineHeight: 25, color: colors.textPrimary },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.textPrimary },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  interactive: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 16 },
};

const SemiFlatCard = () => (
  <View style={{
    padding: 24,
    backgroundColor: colors.bgTertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(104,119,143,0.25)',
    shadowColor: colors.textSecondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 3, // Android
  }}>
    <Text style={[type.h3, { marginBottom: 16 }]}>Semi-Flat Card</Text>
    <Text style={[type.small, { marginBottom: 20 }]}>
      Flat aesthetic with just enough depth to hint at interactivity.
    </Text>
    <Pressable
      style={({ pressed }) => ({
        backgroundColor: colors.btnPrimary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 4,
        alignSelf: 'flex-start',
        transform: [{ scale: pressed ? 0.97 : 1 }],
        shadowColor: colors.btnPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      })}
    >
      <Text style={[type.interactive, { color: '#FFF' }]}>Continue</Text>
    </Pressable>
  </View>
);
```
- On iOS use `shadowOpacity: 0.08...0.14` with `shadowRadius: 16...24`.
- Android elevation and iOS shadow radius use different rendering models; these values are starting points, not visual equivalents.
- Active filters / tabs / focused inputs use `colors.btnSecondary`; hover/pressed-soft surfaces `colors.btnSecondarySoft`.

### Jetpack Compose
```kotlin
// res/font: poppins_regular.ttf (400), poppins_semibold.ttf (600), poppins_extrabold.ttf (800)
val Poppins = FontFamily(
    Font(R.font.poppins_regular, FontWeight.Normal),
    Font(R.font.poppins_semibold, FontWeight.SemiBold),
    Font(R.font.poppins_extrabold, FontWeight.ExtraBold),
)

object AppColors {
    val TextPrimary = Color(0xFF172554)
    val TextSecondary = Color(0xFF68778F)
    val BgPrimary = Color(0xFFEAF3FF)
    val BgSecondary = Color(0xFFDFF1FF)
    val BgTertiary = Color(0xFFF9FCFF)
    val BtnPrimary = Color(0xFF2563EB)
    val BtnSecondary = Color(0xFF8B1E3F)
    val BtnSecondaryAccent = Color(0xFFD67A8C)
    val BtnSecondarySoft = Color(0xFFF7E9ED)
    val Destructive = Color(0xFFD32F2F); val DestructiveSoft = Color(0xFFFCD2D2)
    val Success = Color(0xFF2E7D32);     val SuccessSoft = Color(0xFFC2F2C4)
    val Warning = Color(0xFFFFC107);     val WarningSoft = Color(0xFFFFF1C8)
}

val AppTypography = Typography(
    displayLarge = TextStyle(fontFamily = Poppins, fontWeight = FontWeight.ExtraBold, fontSize = 40.sp, lineHeight = 40.sp),  // H1
    headlineMedium = TextStyle(fontFamily = Poppins, fontWeight = FontWeight.SemiBold, fontSize = 24.sp, lineHeight = 30.sp), // H2
    headlineSmall = TextStyle(fontFamily = Poppins, fontWeight = FontWeight.SemiBold, fontSize = 20.sp, lineHeight = 25.sp),  // H3
    bodyLarge = TextStyle(fontFamily = Poppins, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 24.sp),        // Body
    bodyMedium = TextStyle(fontFamily = Poppins, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 21.sp),       // Small
    labelLarge = TextStyle(fontFamily = Poppins, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 16.sp),     // Interactive
)

@Composable
fun SemiFlatCard() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = 4.dp,
                shape = RoundedCornerShape(8.dp),
                ambientColor = AppColors.TextSecondary.copy(alpha = 0.25f),
                spotColor = AppColors.TextSecondary.copy(alpha = 0.25f),
            ),
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, AppColors.TextSecondary.copy(alpha = 0.25f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        colors = CardDefaults.cardColors(containerColor = AppColors.BgTertiary),
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Text("Semi-Flat Card", style = MaterialTheme.typography.headlineSmall, color = AppColors.TextPrimary)
            Spacer(Modifier.height(16.dp))
            Text(
                "Flat aesthetic with just enough depth to hint at interactivity.",
                style = MaterialTheme.typography.bodyMedium,
                color = AppColors.TextSecondary,
            )
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = {},
                shape = RoundedCornerShape(4.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AppColors.BtnPrimary, contentColor = Color.White),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp, pressedElevation = 1.dp, hoveredElevation = 4.dp),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
            ) {
                Text("Continue", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}
```
- Keep elevation under 4dp; tint shadows with `ambientColor` / `spotColor` using `TextSecondary`.
- Selected tabs, active filter chips and focus indicators use `BtnSecondary`; soft/hover surfaces `BtnSecondarySoft`.

---

## Do's and Don'ts
- **DO**: Keep shadows incredibly subtle and tinted with `#68778F`. If you immediately notice the shadow, it's too dark.
- **DO**: Use only Poppins at the six defined typography tokens.
- **DO**: Reserve blue (`#2563EB`) for primary actions and burgundy (`#8B1E3F`) for secondary/active/focus states.
- **DO**: Pair every alert's solid color with its soft background.
- **DON'T**: Use pure black shadows, inner shadows, heavy gradients, or skeuomorphic textures.
- **DON'T**: Use white text on the yellow alert color; use `#172554`.
- **DON'T**: Add colors, fonts, sizes or weights outside this guide without explicit user request.

## Limitations
- This is a styling reference and does not replace environment-specific validation, accessibility testing, or expert review.
- Ensure appropriate contrast ratios and responsive behaviors are verified separately (notably `#68778F` text on light backgrounds).
- Native line-height behavior varies by platform (especially SwiftUI); verify the 40/40, 24/30, 20/25 and 14/16 tokens visually on device.
