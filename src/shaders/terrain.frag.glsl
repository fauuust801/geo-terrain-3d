/**
 * ═══════════════════════════════════════════════════════════
 *  terrain.frag.glsl
 *  片元着色器 —— 等高线绘制 + 高亮交互 + 分层设色 + 光照
 * ═══════════════════════════════════════════════════════════
 *
 *  核心算法:
 *
 *  ┌─────────────────────── Pipeline ───────────────────────┐
 *  │                                                        │
 *  │  vHeight → hypsometricColor() → baseColor              │
 *  │       ↓                            ↓                   │
 *  │  contourLines()              slopeShading()            │
 *  │       ↓                            ↓                   │
 *  │  contourMask                  slopeFactor              │
 *  │       ↓                            ↓                   │
 *  │  mix(baseColor, contourColor)  ×   slopeFactor         │
 *  │              ↓                                         │
 *  │       + highlightGlow() → lit by lighting()            │
 *  │              ↓                                         │
 *  │         gl_FragColor                                   │
 *  └────────────────────────────────────────────────────────┘
 *
 *  等高线数学原理:
 *
 *    给定高程 h 和等高距 Δh，最近等高线的距离为:
 *
 *      d = | fract(h/Δh + 0.5) - 0.5 | × Δh
 *
 *    其中 fract(x) = x - floor(x)
 *
 *    当 d → 0 时，该片元恰好位于等高线上。
 *
 *    为实现屏幕空间抗锯齿 (Anti-Aliasing):
 *    使用 fwidth(h) 获取高程在屏幕空间的变化率，
 *    再用 smoothstep() 在 ±fwidth 范围内平滑过渡。
 *
 * ═══════════════════════════════════════════════════════════
 */

precision highp float;

// ━━━━━━━━━━━━━━━━ Uniforms ━━━━━━━━━━━━━━━━

// 地形参数
uniform float uContourInterval;     // 等高距 (m)，如 50.0
uniform float uMinElevation;        // 最低海拔 (m)
uniform float uMaxElevation;        // 最高海拔 (m)

// 交互状态
uniform float uActiveElevation;     // 当前高亮海拔，-1.0 = 无高亮
uniform float uTime;                // 累计时间 (秒)，用于动画

// 等高线样式
uniform float uContourWidth;        // 首曲线宽度 (像素)
uniform float uIndexContourEvery;   // 计曲线间隔倍数 (通常 5)
uniform vec3  uContourColor;        // 首曲线颜色 (深色)
uniform vec3  uIndexContourColor;   // 计曲线颜色 (更深)

// 高亮样式
uniform vec3  uHighlightColor;      // 高亮色
uniform float uHighlightIntensity;  // 高亮强度

// 光照
uniform vec3  uSunDirection;        // 太阳方向 (归一化)
uniform float uSunIntensity;        // 太阳强度
uniform vec3  uSkyColor;            // 半球光 - 天空色
uniform vec3  uGroundColor;         // 半球光 - 地面色

// ━━━━━━━━━━━━━━━━ Varyings ━━━━━━━━━━━━━━━━

varying float vHeight;
varying vec3  vWorldPosition;
varying vec3  vWorldNormal;
varying vec3  vViewPosition;
varying vec2  vUv;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  函数 1: 分层设色 (Hypsometric Tinting)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//  地理学标准:
//    低海拔 → 绿色 (植被)
//    中海拔 → 黄褐色 (裸露地面)
//    高海拔 → 棕色 (高山)
//    峰顶  → 灰白色 (雪线以上)
//
//  使用 9 级色阶，通过 if/else 分段线性插值
//  (mix = GLSL 的 lerp)

vec3 hypsometricColor(float t) {
    t = clamp(t, 0.0, 1.0);

    // ── 定义 9 个色阶标 ──
    //    色值来源: Natural Earth DEM 配色方案 (经典地理教学色谱)
    //    stop:   0.00  0.12  0.28  0.42  0.55  0.68  0.80  0.90  1.00

    vec3 c0 = vec3(0.176, 0.416, 0.310);   // #2D6A4F 深绿 (洼地/河谷)
    vec3 c1 = vec3(0.239, 0.549, 0.376);   // #3D8C60 绿   (平原)
    vec3 c2 = vec3(0.522, 0.729, 0.400);   // #85BA66 浅绿 (丘陵)
    vec3 c3 = vec3(0.761, 0.800, 0.420);   // #C2CC6B 黄绿 (低山)
    vec3 c4 = vec3(0.851, 0.722, 0.420);   // #D9B86B 土黄 (中山)
    vec3 c5 = vec3(0.780, 0.549, 0.318);   // #C78C51 黄褐 (高山)
    vec3 c6 = vec3(0.600, 0.400, 0.220);   // #996638 棕色 (高山带)
    vec3 c7 = vec3(0.698, 0.620, 0.549);   // #B29E8C 灰褐 (裸岩)
    vec3 c8 = vec3(0.961, 0.961, 0.961);   // #F5F5F5 雪白 (极高)

    // ── 分段线性插值 ──
    if (t < 0.12)
        return mix(c0, c1, t / 0.12);
    else if (t < 0.28)
        return mix(c1, c2, (t - 0.12) / 0.16);
    else if (t < 0.42)
        return mix(c2, c3, (t - 0.28) / 0.14);
    else if (t < 0.55)
        return mix(c3, c4, (t - 0.42) / 0.13);
    else if (t < 0.68)
        return mix(c4, c5, (t - 0.55) / 0.13);
    else if (t < 0.80)
        return mix(c5, c6, (t - 0.68) / 0.12);
    else if (t < 0.90)
        return mix(c6, c7, (t - 0.80) / 0.10);
    else
        return mix(c7, c8, (t - 0.90) / 0.10);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  函数 2: 等高线计算 (Contour Lines)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//  返回: vec2(首曲线强度, 计曲线强度)
//  均为 [0, 1]，0 = 不在线上，1 = 线中心
//
//  技术细节:
//    fwidth(h) = |dh/dx_screen| + |dh/dy_screen|
//    该值表示高程在屏幕空间上每像素的变化量。
//    与相机距离成反比: 远 → fwidth 大 → 线条阈值放宽 → 视觉宽度恒定

vec2 contourLines(float h, float interval, float indexEvery,
                  float lineWidth) {
    // ── 屏幕空间导数: 抗锯齿的核心 ──
    float fw = fwidth(h);

    // 防止 fw 极端情况 (相机过远或地形极平)
    fw = max(fw, 0.0001);

    // ── 首曲线 (Basic Contour / 首曲线) ──
    // 到最近等高线的高程距离
    float distBasic = abs(fract(h / interval + 0.5) - 0.5) * interval;

    // 线条半宽 (以高程为单位)
    float halfWidth = fw * lineWidth * 0.5;

    // smoothstep 抗锯齿:
    //   d < halfWidth-fw  →  1.0 (线内部)
    //   d > halfWidth+fw  →  0.0 (线外部)
    //   之间平滑过渡
    float basicLine = 1.0 - smoothstep(
        halfWidth - fw * 0.5,
        halfWidth + fw * 0.5,
        distBasic
    );

    // ── 计曲线 (Index Contour / 计曲线) ──
    // 每 indexEvery 条首曲线加粗为计曲线
    // 计曲线间距 = interval × indexEvery
    float indexInterval = interval * indexEvery;
    float distIndex = abs(fract(h / indexInterval + 0.5) - 0.5) * indexInterval;

    // 计曲线更粗: 宽度 × 1.8
    float indexHalfWidth = fw * lineWidth * 0.9;
    float indexLine = 1.0 - smoothstep(
        indexHalfWidth - fw * 0.5,
        indexHalfWidth + fw * 0.5,
        distIndex
    );

    return vec2(basicLine, indexLine);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  函数 3: 高亮等高面 (Elevation Band Highlight)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//  当 uActiveElevation ≥ 0 时，高亮鼠标所在的等高面区间。
//
//  等高面: [floor(h/Δh)·Δh,  floor(h/Δh)·Δh + Δh]
//  即包含指定海拔的两条相邻等高线之间的带状区域。
//
//  效果: 带状区域叠加半透明高亮色 + 脉动动画

float elevationHighlight(float h, float activeElev, float interval,
                         float time) {
    // 无高亮
    if (activeElev < 0.0) return 0.0;

    // 计算高亮带的中心与半宽
    float bandIndex = floor(activeElev / interval);
    float bandCenter = (bandIndex + 0.5) * interval;
    float bandHalf = interval * 0.5;

    // 当前片元到带中心的距离
    float dist = abs(h - bandCenter);

    // 屏幕空间抗锯齿边缘
    float fw = fwidth(h);
    float edgeSoftness = max(fw * 2.0, interval * 0.05);

    // 带内 → 1.0, 带外 → 0.0, 边缘平滑
    float inBand = 1.0 - smoothstep(
        bandHalf - edgeSoftness,
        bandHalf + edgeSoftness,
        dist
    );

    // 呼吸脉动: 0.65 ~ 1.0 之间柔和变化
    float pulse = 0.65 + 0.35 * sin(time * 2.5);

    return inBand * pulse;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  函数 4: 光照模型 (Lighting)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//  实现简化的 Phong 光照模型 + 半球光:
//    L_final = L_hemisphere + L_diffuse + L_specular
//
//  地理学关联:
//    地形晕渲 (Hillshading) 传统上使用 NW (315°) 光源，
//    即太阳光从左上方照射，产生地形的明暗变化，
//    这是等高线地图中增强立体感的经典技法。

vec3 calculateLighting(vec3 baseColor, vec3 N, vec3 viewDir) {
    // ── 半球光 (Hemisphere Light) ──
    // 模拟天穹散射: 朝上的面接收天空色，朝下的面接收地面色
    float hemiWeight = 0.5 + 0.5 * dot(N, vec3(0.0, 1.0, 0.0));
    vec3 hemiLight = mix(uGroundColor, uSkyColor, hemiWeight);
    vec3 ambient = baseColor * hemiLight * 0.45;

    // ── Lambert 漫反射 (Lambertian Diffuse) ──
    float NdotL = max(dot(N, uSunDirection), 0.0);

    // Soft wrap lighting: 避免背光面完全漆黑
    // 将 NdotL 从 [-1,1] 映射到 [0.15, 1]
    float wrapDiffuse = NdotL * 0.85 + 0.15;

    vec3 diffuse = baseColor * wrapDiffuse * uSunIntensity;

    // ── Blinn-Phong 镜面反射 ──
    // 模拟湿润岩石/水面的微弱光泽
    vec3 halfDir = normalize(uSunDirection + viewDir);
    float NdotH = max(dot(N, halfDir), 0.0);
    float specular = pow(NdotH, 64.0) * 0.12 * uSunIntensity;

    // ── 合成 ──
    vec3 finalLight = ambient + diffuse + vec3(specular);

    return finalLight;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  主函数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

void main() {
    float h = vHeight;
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(-vViewPosition);   // 视线方向 (片元 → 相机)

    // ── [1] 归一化高程 → 分层设色 ──
    float elevRange = uMaxElevation - uMinElevation;
    float t = (elevRange > 0.0) ? (h - uMinElevation) / elevRange : 0.5;
    vec3 baseColor = hypsometricColor(t);

    // ── [2] 坡度增强 (Slope-based Shading) ──
    // 陡坡区域（陡崖）加深颜色，增强纹理感
    // slope = 0 (平坦) → 1 (垂直)
    float slope = 1.0 - dot(N, vec3(0.0, 1.0, 0.0));
    float slopeDarken = 1.0 - slope * 0.35;
    baseColor *= slopeDarken;

    // ── [3] 等高线 ──
    vec2 contours = contourLines(
        h,
        uContourInterval,
        uIndexContourEvery,
        uContourWidth
    );

    float basicContour = contours.x;
    float indexContour = contours.y;

    // 合成等高线颜色:
    //   先叠加首曲线（较细、较浅）
    //   再叠加计曲线（较粗、较深、覆盖首曲线）
    vec3 colorWithContours = baseColor;

    // 首曲线: 半透明叠加
    colorWithContours = mix(
        colorWithContours,
        uContourColor,
        basicContour * 0.6   // 首曲线不透明度 60%
    );

    // 计曲线: 更深更不透明
    colorWithContours = mix(
        colorWithContours,
        uIndexContourColor,
        indexContour * 0.85  // 计曲线不透明度 85%
    );

    // ── [4] 等高面高亮 ──
    float highlight = elevationHighlight(
        h,
        uActiveElevation,
        uContourInterval,
        uTime
    );

    // 高亮混合策略:
    //   [a] 底色混入高亮色 (半透明叠加)
    //   [b] 额外添加发光 (additive，模拟 emission)
    vec3 highlighted = mix(
        colorWithContours,
        uHighlightColor,
        highlight * 0.35 * uHighlightIntensity
    );

    // 发光效果: 在高亮区域叠加微弱自发光
    vec3 glow = uHighlightColor * highlight * 0.2 * uHighlightIntensity;
    highlighted += glow;

    // ── [5] 高亮区域的等高线加强 ──
    // 在高亮带内，等高线边界（上下边沿）额外加亮
    if (uActiveElevation >= 0.0) {
        float bandIndex = floor(uActiveElevation / uContourInterval);
        float bandMin = bandIndex * uContourInterval;
        float bandMax = bandMin + uContourInterval;

        float fw = fwidth(h);
        float edgeWidth = max(fw * 2.0, 1.5);

        // 上边沿等高线
        float upperEdge = 1.0 - smoothstep(0.0, edgeWidth, abs(h - bandMax));
        // 下边沿等高线
        float lowerEdge = 1.0 - smoothstep(0.0, edgeWidth, abs(h - bandMin));

        float bandEdge = max(upperEdge, lowerEdge) * highlight;

        highlighted = mix(
            highlighted,
            uHighlightColor * 1.3,  // 略微过曝，增强亮度
            bandEdge * 0.7
        );
    }

    // ── [6] 光照计算 ──
    vec3 litColor = calculateLighting(highlighted, N, V);

    // ── [7] 最终输出 ──
    gl_FragColor = vec4(litColor, 1.0);
}
