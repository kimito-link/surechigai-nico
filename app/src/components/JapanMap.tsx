import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import prefecturePaths from "@/data/japanMapPaths";

interface JapanMapProps {
  filledPrefectures: string[];
  fillColor?: string;
  emptyColor?: string;
  width?: number;
  height?: number;
}

export function JapanMap({
  filledPrefectures,
  fillColor = "#E8734A",
  emptyColor = "#E0E0E0",
  width = 300,
  height = 375,
}: JapanMapProps) {
  const filledSet = new Set(filledPrefectures);

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height} viewBox="0 0 400 500">
        {prefecturePaths.map((pref) => (
          <Path
            key={pref.id}
            d={pref.d}
            fill={filledSet.has(pref.id) ? fillColor : emptyColor}
            stroke="#FFF"
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}
