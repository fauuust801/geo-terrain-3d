/**
 * ═══════════════════════════════════════════════════════════
 *  terrain.vert.glsl
 *  顶点着色器
 * ═══════════════════════════════════════════════════════════
 *
 *  职责:
 *    1. 将顶点从模型空间变换到裁剪空间
 *    2. 将原始高程 (aHeight) 传递给片元着色器
 *    3. 传递世界空间法线 (用于光照)
 *    4. 传递世界空间坐标 (用于空间参考)
 *
 *  Three.js 自动注入的内置 uniform:
 *    modelMatrix, viewMatrix, projectionMatrix, normalMatrix
 *
 *  Three.js 自动注入的内置 attribute:
 *    position, normal, uv
 */

// ── 自定义 Attribute ──
// 原始高程值（概念米），在 JS 侧通过 terrainGenerator.getHeight() 计算
// 不受垂直夸大率影响——这是地理学意义上的"真实海拔"
attribute float aHeight;

// ── Varyings → 传递到 Fragment Shader ──
varying float vHeight;          // 原始高程 (m)
varying vec3  vWorldPosition;   // 世界空间坐标
varying vec3  vWorldNormal;     // 世界空间法线 (归一化)
varying vec3  vViewPosition;    // 观察空间坐标 (相机空间)
varying vec2  vUv;              // UV 坐标

void main() {
    // 传递原始高程（等高线计算的基础）
    vHeight = aHeight;
    vUv = uv;

    // ── 世界空间变换 ──
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;

    // 法线变换: 使用 modelMatrix 的左上 3×3 子矩阵
    // 对于均匀缩放，这足够正确
    // 对于非均匀缩放（如 VE），需要逆转置，但我们在 JS 侧
    // 通过 computeVertexNormals() 已正确计算了变形后法线
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    // ── 观察空间坐标 (用于镜面反射计算) ──
    vec4 viewPos = viewMatrix * worldPos;
    vViewPosition = viewPos.xyz;

    // ── 最终投影 ──
    gl_Position = projectionMatrix * viewPos;
}
