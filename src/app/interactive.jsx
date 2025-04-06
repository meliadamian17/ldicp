"use client";

import { useState, useEffect, useRef } from "react";
import solver from "javascript-lp-solver";

export default function LargestDiskInPolygon() {
  const svgRef = useRef(null);
  const [vertices, setVertices] = useState([
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 300 },
    { x: 100, y: 300 },
  ]);
  const [disk, setDisk] = useState({
    center: { x: 200, y: 200 },
    radius: 100,
  });
  const [draggingIndex, setDraggingIndex] = useState(null);

  useEffect(() => {
    const largestDisk = calculateLargestDisk(vertices);
    setDisk(largestDisk);
  }, [vertices]);

  function getSVGPoint(clientX, clientY) {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function handlePointerDown(index) {
    return (e) => {
      e.preventDefault();
      setDraggingIndex(index);
    };
  }

  function handlePointerMove(e) {
    if (draggingIndex === null) return;
    const pt = getSVGPoint(e.clientX, e.clientY);
    setVertices((prev) =>
      prev.map((v, i) =>
        i === draggingIndex ? { x: pt.x, y: pt.y } : v
      )
    );
  }

  function handlePointerUp() {
    setDraggingIndex(null);
  }

  function calculateLargestDisk(points) {
    if (points.length < 3) {
      return { center: { x: 0, y: 0 }, radius: 0 };
    }

    const model = {
      optimize: "radius",
      opType: "max",
      constraints: {},
      variables: {
        x: { radius: 0 },
        y: { radius: 0 },
        radius: { radius: 1 },
      },
    };

    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const p1 = points[i];
      const p2 = points[j];

      const a = p2.y - p1.y;
      const b = p1.x - p2.x;
      const c = p2.x * p1.y - p1.x * p2.y;
      const norm = Math.sqrt(a * a + b * b);

      const constraintName = `edge${i}`;
      model.constraints[constraintName] = { max: -c };
      model.variables.x[constraintName] = a;
      model.variables.y[constraintName] = b;
      model.variables.radius[constraintName] = norm;
    }

    const result = solver.Solve(model);

    if (result.feasible) {
      return {
        center: { x: result.x, y: result.y },
        radius: result.radius,
      };
    } else {
      const centerX =
        points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const centerY =
        points.reduce((sum, p) => sum + p.y, 0) / points.length;

      let minDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        const p1 = points[i];
        const p2 = points[j];

        const a = p2.y - p1.y;
        const b = p1.x - p2.x;
        const c = p2.x * p1.y - p1.x * p2.y;
        const norm = Math.sqrt(a * a + b * b);

        const dist = Math.abs(a * centerX + b * centerY + c) / norm;
        minDist = Math.min(minDist, dist);
      }

      return {
        center: { x: centerX, y: centerY },
        radius: minDist,
      };
    }
  }

  const polygonPoints = vertices
    .map((v) => `${v.x},${v.y}`)
    .join(" ");

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          width={500}
          height={500}
          viewBox="0 0 500 500"
          className="bg-gray-50"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <polygon
            points={polygonPoints}
            fill="rgba(200,230,255,0.5)"
            stroke="rgba(100,150,230,0.8)"
            strokeWidth={2}
          />
          <circle
            cx={disk.center.x}
            cy={disk.center.y}
            r={disk.radius}
            fill="rgba(255,180,180,0.5)"
            stroke="rgba(230,100,100,0.8)"
            strokeWidth={2}
          />
          <circle
            cx={disk.center.x}
            cy={disk.center.y}
            r={4}
            fill="rgba(230,100,100,1)"
          />
          {vertices.map((v, i) => (
            <circle
              key={i}
              cx={v.x}
              cy={v.y}
              r={8}
              fill="rgba(100,150,230,1)"
              style={{ cursor: "grab" }}
              onPointerDown={handlePointerDown(i)}
            />
          ))}
        </svg>
      </div>

      <div className="mt-4 text-sm text-gray-700">
        <p>Drag the blue vertices to reshape the polygon.</p>
        <p className="mt-2">
          Largest disk: radius = {disk.radius.toFixed(2)}, center = (
          {disk.center.x.toFixed(2)}, {disk.center.y.toFixed(2)})
        </p>
      </div>

      <button
        className="mt-2 px-4 py-2 bg-blue-500 text-white font-bold rounded hover:bg-blue-600"
        onClick={() => {
          setVertices([
            { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 },
            { x: 300 + Math.random() * 50, y: 100 + Math.random() * 50 },
            { x: 300 + Math.random() * 50, y: 300 + Math.random() * 50 },
            { x: 100 + Math.random() * 50, y: 300 + Math.random() * 50 },
          ]);
        }}
      >
        Randomize Polygon
      </button>

      <button
        className="mt-2 px-4 py-2 bg-green-500 text-white font-bold rounded hover:bg-green-600"
        onClick={() => {
          const newVertices = [...vertices];
          newVertices.push({
            x: 200 + Math.random() * 100 - 50,
            y: 200 + Math.random() * 100 - 50,
          });
          setVertices(newVertices);
        }}
      >
        Add Vertex
      </button>
    </div>
  );
}

