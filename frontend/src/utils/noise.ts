import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import alea from "@/utils/alea";

export interface FBmProps {
  numOctaves: number;
  H: number;
  lacunarity: number;
  scale: number;
  height: number;
  [key: string]: number;
}

// singelton pattern for fBmProps
export const fBmProps: FBmProps = {
  numOctaves: 1.0,
  H: 1.0,
  lacunarity: 2.0,
  scale: 160.0,
  height: 10.0,
};

const noise = createNoise2D(alea("seed"));

// Function to generate fractal Brownian motion (fBm) noise.
// H is the Hurst exponent [0, 1], which controls the roughness of the noise.
// A value of 0.5 gives the smoothest noise, while a value of 1.0 gives the roughest.
// numOctaves is the number of octaves to sum together.
// G is the gain, which controls how quickly the amplitude diminishes for each octave. [0.5, 1]
// Most of the time G = 0.5 => H = 1 is used.
// Based on the following article by Inigo Quilez https://iquilezles.org/articles/fbm/
export function fBm(
  x: number,
  y: number,
  {
    numOctaves = 8.0,
    H = 1.0,
    lacunarity = 2.0,
    scale = 1,
    height = 1,
  }: FBmProps,
): number {
  const G: number = Math.pow(2.0, -H);
  let frequency = 1 / scale;
  let amplitude = 1.0;
  let total = 0.0;
  let normalization = 0.0;
  for (let i = 0; i < numOctaves; i++) {
    total += amplitude * noise(x * frequency, y * frequency) * 0.5 + 0.5; // remap noise to [0, 1]
    frequency *= lacunarity;
    normalization += amplitude;
    amplitude *= G;
  }
  return (total / normalization) * height; // normalize to [0, 1] and scale to height
}

export function generateHeightMapTexture(
  size: number,
  fbmParams: FBmProps = fBmProps,
): THREE.DataTexture {
  // Create a Float32Array to hold our height data
  const data = new Float32Array(size * size);

  // Generate height data using fBm
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      const v = y / (size - 1);
      const index = y * size + x;
      data[index] = fBm(u, v, fbmParams);
    }
  }

  // Create a DataTexture from our height data
  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RedFormat,
    THREE.FloatType,
  );
  texture.needsUpdate = true;

  return texture;
}
