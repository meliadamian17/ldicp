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
  const [isConvex, setIsConvex] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {

    const convexityCheck = checkIfConvex(vertices);
    setIsConvex(convexityCheck);


    if (draggingIndex === null) {
      setShowWarning(!convexityCheck);
    }


    if (convexityCheck) {
      const largestDisk = calculateLargestDisk(vertices);
      setDisk(largestDisk);
    }
  }, [vertices, draggingIndex]);

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

      setShowWarning(false);
    };
  }

  function handlePointerMove(e) {
    if (draggingIndex === null) return;
    const pt = getSVGPoint(e.clientX, e.clientY);

    setVertices((prev) => {
      const newVertices = [...prev];
      newVertices[draggingIndex] = { x: pt.x, y: pt.y };
      return newVertices;
    });
  }

  function handlePointerUp() {

    setShowWarning(!isConvex);
    setDraggingIndex(null);
  }


  function checkIfConvex(points) {
    if (points.length < 3) return true;


    let sign = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const k = (i + 2) % points.length;

      const crossProduct = cross(points[i], points[j], points[k]);

      if (crossProduct !== 0) {
        if (sign === 0) {
          sign = Math.sign(crossProduct);
        } else if (sign !== Math.sign(crossProduct)) {
          return false;
        }
      }
    }

    return true;
  }


  function cross(p1, p2, p3) {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
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


    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y - points[j].x * points[i].y;
    }


    const orientedPoints = area < 0 ? [...points].reverse() : [...points];


    for (let i = 0; i < orientedPoints.length; i++) {
      const j = (i + 1) % orientedPoints.length;
      const p1 = orientedPoints[i];
      const p2 = orientedPoints[j];


      const a = p2.y - p1.y;
      const b = p1.x - p2.x;
      const c = p2.x * p1.y - p1.x * p2.y;


      const norm = Math.sqrt(a * a + b * b);



      const testPoint = findInteriorPoint(orientedPoints);
      const sign = Math.sign(a * testPoint.x + b * testPoint.y + c);


      const adjustedA = sign < 0 ? a : -a;
      const adjustedB = sign < 0 ? b : -b;
      const adjustedC = sign < 0 ? c : -c;


      const constraintName = `edge${i}`;
      model.constraints[constraintName] = { max: -adjustedC };
      model.variables.x[constraintName] = adjustedA;
      model.variables.y[constraintName] = adjustedB;
      model.variables.radius[constraintName] = norm;
    }


    try {
      const result = solver.Solve(model);

      if (result && result.feasible !== false) {

        const center = { x: result.x, y: result.y };
        const finalRadius = computeMinimumDistanceToEdges(center, orientedPoints);

        return {
          center: center,
          radius: finalRadius
        };
      }
    } catch (error) {
      console.error("LP solver error:", error);
    }


    return naiveCenterApproach(orientedPoints);
  }

  function findInteriorPoint(points) {

    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  }

  function computeMinimumDistanceToEdges(center, points) {
    let minDist = Infinity;

    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const p1 = points[i];
      const p2 = points[j];


      const a = p2.y - p1.y;
      const b = p1.x - p2.x;
      const c = p2.x * p1.y - p1.x * p2.y;
      const norm = Math.sqrt(a * a + b * b);


      const dist = Math.abs(a * center.x + b * center.y + c) / norm;
      minDist = Math.min(minDist, dist);
    }

    return minDist;
  }

  function naiveCenterApproach(points) {

    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    const center = { x: centerX, y: centerY };


    const radius = computeMinimumDistanceToEdges(center, points);

    return { center, radius };
  }

  function makeConvexHull(points) {
    if (points.length <= 3) return points;


    let bottomPoint = points[0];
    for (let i = 1; i < points.length; i++) {
      if (
        points[i].y < bottomPoint.y ||
        (points[i].y === bottomPoint.y && points[i].x < bottomPoint.x)
      ) {
        bottomPoint = points[i];
      }
    }


    const sortedPoints = [...points];
    sortedPoints.sort((a, b) => {
      if (a === bottomPoint) return -1;
      if (b === bottomPoint) return 1;

      const crossProduct = cross(bottomPoint, a, b);
      if (crossProduct === 0) {

        const distA =
          (a.x - bottomPoint.x) * (a.x - bottomPoint.x) +
          (a.y - bottomPoint.y) * (a.y - bottomPoint.y);
        const distB =
          (b.x - bottomPoint.x) * (b.x - bottomPoint.x) +
          (b.y - bottomPoint.y) * (b.y - bottomPoint.y);
        return distA - distB;
      }

      return crossProduct < 0 ? 1 : -1;
    });


    const hull = [sortedPoints[0], sortedPoints[1]];

    for (let i = 2; i < sortedPoints.length; i++) {
      while (
        hull.length > 1 &&
        cross(hull[hull.length - 2], hull[hull.length - 1], sortedPoints[i]) <= 0
      ) {
        hull.pop();
      }
      hull.push(sortedPoints[i]);
    }

    return hull;
  }


  function addConvexVertex() {

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const v of vertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }


    const centroid = findInteriorPoint(vertices);


    const edgeIndex = Math.floor(Math.random() * vertices.length);
    const p1 = vertices[edgeIndex];
    const p2 = vertices[(edgeIndex + 1) % vertices.length];


    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;


    const dx = midX - centroid.x;
    const dy = midY - centroid.y;


    const len = Math.sqrt(dx * dx + dy * dy);
    const normDx = dx / len;
    const normDy = dy / len;


    const scaleFactor = Math.max(maxX - minX, maxY - minY) * 0.3;



    const edgeVectorX = p2.x - p1.x;
    const edgeVectorY = p2.y - p1.y;
    const edgeLen = Math.sqrt(edgeVectorX * edgeVectorX + edgeVectorY * edgeVectorY);


    const perpX = -edgeVectorY / edgeLen;
    const perpY = edgeVectorX / edgeLen;


    const dotProduct = perpX * (midX - centroid.x) + perpY * (midY - centroid.y);
    const adjustedPerpX = dotProduct >= 0 ? perpX : -perpX;
    const adjustedPerpY = dotProduct >= 0 ? perpY : -perpY;


    const randomAngle = (Math.random() - 0.5) * Math.PI / 4;
    const cosAngle = Math.cos(randomAngle);
    const sinAngle = Math.sin(randomAngle);


    const rotatedPerpX = adjustedPerpX * cosAngle - adjustedPerpY * sinAngle;
    const rotatedPerpY = adjustedPerpX * sinAngle + adjustedPerpY * cosAngle;


    const newPointX = midX + rotatedPerpX * scaleFactor;
    const newPointY = midY + rotatedPerpY * scaleFactor;


    const newVertices = [...vertices, { x: newPointX, y: newPointY }];
    return makeConvexHull(newVertices);
  }

  const polygonPoints = vertices.map((v) => `${v.x},${v.y}`).join(" ");

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {showWarning && (
        <div className="w-full max-w-2xl p-4 mb-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p className="font-bold">Warning: Non-convex polygon</p>
          <p>The largest disk can only be computed for convex polygons. Please adjust vertices to make the polygon convex.</p>
        </div>
      )}

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
            fill={isConvex ? "rgba(200,230,255,0.5)" : "rgba(255,200,200,0.5)"}
            stroke={isConvex ? "rgba(100,150,230,0.8)" : "rgba(230,100,100,0.8)"}
            strokeWidth={2}
          />

          {isConvex && (
            <>
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
            </>
          )}

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
        {isConvex && (
          <p className="mt-2">
            Largest disk: radius = {disk.radius.toFixed(2)}, center = (
            {disk.center.x.toFixed(2)}, {disk.center.y.toFixed(2)})
          </p>
        )}
      </div>

      <div className="flex gap-2 mt-2">
        <button
          className="px-4 py-2 bg-blue-500 text-white font-bold rounded hover:bg-blue-600"
          onClick={() => {
            const randomPoints = [];
            for (let i = 0; i < 5; i++) {
              randomPoints.push({
                x: 150 + Math.random() * 200,
                y: 150 + Math.random() * 200,
              });
            }
            setVertices(makeConvexHull(randomPoints));
          }}
        >
          Randomize Polygon
        </button>

        <button
          className="px-4 py-2 bg-green-500 text-white font-bold rounded hover:bg-green-600"
          onClick={() => {

            setVertices(addConvexVertex());
          }}
        >
          Add Vertex
        </button>

        {showWarning && (
          <button
            className="px-4 py-2 bg-purple-500 text-white font-bold rounded hover:bg-purple-600"
            onClick={() => {

              setVertices(makeConvexHull(vertices));
            }}
          >
            Make Convex
          </button>
        )}
      </div>
    </div>
  );
}

