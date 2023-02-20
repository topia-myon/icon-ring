import useSize from "@react-hook/size";
import classNames from "classnames";
import { useState, useRef, useEffect, useCallback } from "react";
import useFileUpload from "react-use-file-upload";
import useInputFile from "use-input-file";
import { useRect } from "./hooks/useRect";

const CANVAS_SIZE = 1024;
const PADDING_X = 16;
const PADDING_Y = 16;

function App() {
  const container = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasImgRef = useRef<HTMLImageElement>(new Image());
  const ringRef = useRef<HTMLImageElement>(null);
  const canvasRect = useRect(canvasRef);

  const [width, height] = useSize(container);
  const size = Math.max(
    0,
    Math.min(width - 2 * PADDING_X, height - 2 * PADDING_Y)
  );
  const { ref: iconInputRef, files: iconFiles } = useInputFile({
    options: {
      accept: "image/*",
      multiple: false,
    },
  });
  const { ref: ringInputRef, files: ringFiles } = useInputFile({
    options: {
      accept: "image/*",
      multiple: false,
    },
  });
  const image = iconFiles?.at(0);
  const ringImage = ringFiles?.at(0);
  const [ringSrc, setRingSrc] = useState("");

  useEffect(() => {
    if (!ringImage) return;
    const src = URL.createObjectURL(ringImage);
    setRingSrc(src);

    return () => {
      URL.revokeObjectURL(src);
    };
  }, [ringImage]);

  const touchesRef = useRef<{ x: number; y: number }[]>([]);
  const [zoom, setZoom] = useState(1);
  const [lazyZoom, setLazyZoom] = useState(1);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [lazyOrigin, setLazyOrigin] = useState({ x: 0, y: 0 });
  const singleTouchRef = useRef({ x: 0, y: 0 });

  const isDark = ({ r, g, b }: { r: number; g: number; b: number }) =>
    0.2126 * r + 0.7152 * g + 0.0722 * b < 255 * 0.7;

  const [backgroundColor, setBackgroundColor] = useState({
    r: 255,
    g: 255,
    b: 255,
  });
  const [tempBackgroundColor, setTempBackgroundColor] = useState({
    r: 255,
    g: 255,
    b: 255,
  });
  const [backgroundSelectionStage, setBackgroundSelectionStage] = useState(0);
  const isSelectingBackground = backgroundSelectionStage > 0;

  useEffect(() => {
    if (!image) return;

    const img = canvasImgRef.current;
    if (!img) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setZoom(1);
    setOrigin({
      x: 0,
      y: 0,
    });
    setLazyZoom(1);
    setLazyOrigin({
      x: 0,
      y: 0,
    });

    const url = URL.createObjectURL(image);
    img.onload = function () {
      draw(ctx, img, 1, { x: 0, y: 0 }, false);
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [image]);

  useEffect(() => {
    const img = canvasImgRef.current;
    if (!img) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (image) {
      draw(ctx, img, zoom, origin, isSelectingBackground);
    } else {
      ctx.beginPath();
      ctx.fillStyle = `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.closePath();
      ctx.drawImage(ringRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
  }, [zoom, origin, isSelectingBackground]);

  const draw = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      img: HTMLImageElement,
      zoom: number,
      origin: number,
      drawRing: boolean
    ) => {
      const w = img.width;
      const h = img.height;
      const m = Math.min(w, h);

      // clear rect with white background
      ctx.beginPath();
      ctx.fillStyle = `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.closePath();

      ctx.drawImage(
        img,
        w / 2 - m / (2 * zoom) + (origin.x * m) / zoom,
        h / 2 - m / (2 * zoom) + (origin.y * m) / zoom,
        m / zoom,
        m / zoom,
        0,
        0,
        CANVAS_SIZE,
        CANVAS_SIZE
      );
      if (drawRing && ringRef.current) {
        ctx.drawImage(ringRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }
    },
    [backgroundColor]
  );

  const [count, setCount] = useState(0);

  const [backgroundTooltipPosition, setBackgroundTooltipPosition] = useState({
    x: 0,
    y: 0,
  });
  const backgroundTooltipCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isSelectingBackground) return;

    const backgroundTooltipCanvas = backgroundTooltipCanvasRef.current;
    if (!backgroundTooltipCanvas) return;
    const backgroundTooltipCtx = backgroundTooltipCanvas.getContext("2d");
    if (!backgroundTooltipCtx) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    backgroundTooltipCtx.beginPath();
    backgroundTooltipCtx.fillStyle = `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`;
    backgroundTooltipCtx.fillRect(0, 0, 256, 256);
    backgroundTooltipCtx.closePath();

    const ZOOM = 3;
    backgroundTooltipCtx.drawImage(
      canvas,
      Math.round(
        (backgroundTooltipPosition.x - canvasRect.left - 64 / ZOOM) *
          (CANVAS_SIZE / size)
      ),
      Math.round(
        (backgroundTooltipPosition.y - canvasRect.top - 64 / ZOOM) *
          (CANVAS_SIZE / size)
      ),
      (128 / ZOOM) * (CANVAS_SIZE / size),
      (128 / ZOOM) * (CANVAS_SIZE / size),
      0,
      0,
      256,
      256
    );
    const imageData = backgroundTooltipCtx.getImageData(128, 128, 1, 1);
    const [r, g, b] = Array.from(imageData.data).slice(0, 3);
    setTempBackgroundColor({ r, g, b });
  }, [backgroundTooltipPosition, backgroundColor, canvasRect]);

  return (
    <div
      ref={container}
      className="h-full grid place-items-center relative z-0"
      style={{
        backgroundColor: `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`,
      }}
      onTouchStart={(e) => {
        if (e.touches.length === 1) {
          if (isSelectingBackground) {
            setBackgroundSelectionStage(2);
            setBackgroundTooltipPosition({
              x: e.touches.item(0).clientX,
              y: e.touches.item(0).clientY,
            });
          } else {
            singleTouchRef.current = {
              x: e.touches.item(0).clientX,
              y: e.touches.item(0).clientY,
            };
          }
        }
        if (e.touches.length === 2 && !isSelectingBackground) {
          setLazyOrigin(origin);
          touchesRef.current = [
            {
              x: e.touches.item(0).clientX,
              y: e.touches.item(0).clientY,
            },
            {
              x: e.touches.item(1).clientX,
              y: e.touches.item(1).clientY,
            },
          ];
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length === 0) return;
        if (e.touches.length === 1) {
          if (isSelectingBackground) {
            setBackgroundTooltipPosition({
              x: e.touches.item(0).clientX,
              y: e.touches.item(0).clientY,
            });
          } else {
            const x = e.touches.item(0).clientX;
            const y = e.touches.item(0).clientY;
            const diffX = singleTouchRef.current.x - x;
            const diffY = singleTouchRef.current.y - y;
            setOrigin((origin) => ({
              x: Math.min(1, Math.max(-1, origin.x + diffX / size)),
              y: Math.min(1, Math.max(-1, origin.y + diffY / size)),
            }));
            singleTouchRef.current = { x, y };
          }
          return;
        }

        if (!touchesRef.current || touchesRef.current.length < 2) return;

        const touches = [
          {
            x: e.touches.item(0).clientX,
            y: e.touches.item(0).clientY,
          },
          {
            x: e.touches.item(1).clientX,
            y: e.touches.item(1).clientY,
          },
        ];

        const distance = Math.hypot(
          touches[0].x - touches[1].x,
          touches[0].y - touches[1].y
        );
        const distanceDiff =
          distance -
          Math.hypot(
            touchesRef.current[0].x - touchesRef.current[1].x,
            touchesRef.current[0].y - touchesRef.current[1].y
          );
        const EXP = 1.8;
        const SCALE = 0.5;
        setZoom(
          Math.max(
            0.2,
            Math.min(
              3,
              Math.pow(
                Math.max(
                  0,
                  Math.pow(lazyZoom, 1 / EXP) + (distanceDiff / size) * SCALE
                ),
                EXP
              )
            )
          )
        );

        const diffX =
          (touchesRef.current[0].x +
            touchesRef.current[1].x -
            (touches[0].x + touches[1].x)) /
          2;
        const diffY =
          (touchesRef.current[0].y +
            touchesRef.current[1].y -
            (touches[0].y + touches[1].y)) /
          2;
        setOrigin({
          x: Math.min(1, Math.max(-1, lazyOrigin.x + diffX / size)),
          y: Math.min(1, Math.max(-1, lazyOrigin.y + diffY / size)),
        });
      }}
      onTouchEnd={(e) => {
        if (e.touches.length === 1 && !isSelectingBackground) {
          setLazyZoom(zoom);
          setLazyOrigin(origin);
          singleTouchRef.current = {
            x: e.touches.item(0).clientX,
            y: e.touches.item(0).clientY,
          };
        }

        if (e.touches.length === 0 && isSelectingBackground) {
          setBackgroundSelectionStage(0);
          setBackgroundColor(tempBackgroundColor);
        }
      }}
    >
      <input
        className="top-0 absolute left-0 hidden pointer-events-none"
        ref={iconInputRef}
      />
      <input
        className="top-0 absolute left-0 hidden pointer-events-none"
        ref={ringInputRef}
      />
      <div
        className={classNames(
          "absolute w-full flex justify-center top-4 z-10 space-x-2",
          isSelectingBackground && "hidden"
        )}
      >
        <button
          className="bg-white px-1.5 py-1 font-bold shadow-md rounded-md"
          onClick={() => {
            iconInputRef.current?.click();
          }}
        >
          トプ画選択
        </button>
        <button
          className="bg-white px-1.5 py-1 font-bold shadow-md rounded-md"
          onClick={() => {
            ringInputRef.current?.click();
          }}
        >
          リング選択
        </button>
        <button
          className="px-1.5 py-1 font-bold shadow-md rounded-md"
          onClick={() => {
            setBackgroundSelectionStage(1);
          }}
          style={{
            backgroundColor: `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`,
            color: isDark(backgroundColor) ? "white" : "black",
          }}
        >
          背景色
        </button>
        <button
          className="bg-blue-500 text-white px-1.5 py-1 font-bold shadow-md rounded-md"
          onClick={() => {
            const img = canvasImgRef.current;
            if (!img) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            if (image) {
              draw(ctx, img, zoom, origin, true);
            } else {
              ctx.beginPath();
              ctx.fillStyle = `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`;
              ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
              ctx.closePath();
              ctx.drawImage(ringRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
            }

            const anchor = document.createElement("a");
            anchor.href = canvas.toDataURL("image/png");
            anchor.download = `icon-ring-${new Date()
              .toISOString()
              .slice(0, 19)
              .replace(/[^0-9]/g, "-")}.png`;
            anchor.click();
            anchor.remove();
          }}
        >
          ダウンロード
        </button>
      </div>
      <div
        className="relative pointer-events-none"
        style={{
          width: size,
          height: size,
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 origin-top-left"
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            transform: `scale(${size / CANVAS_SIZE})`,
          }}
        />

        <img
          ref={ringRef}
          src={ringSrc || "./rui-mar-touryuumon-icon-ring.png"}
          className="w-full h-full absolute top-0 left-0"
        />
      </div>

      <div
        className={classNames(
          "absolute border-slate-300 rounded-full border",
          backgroundSelectionStage < 2 && "hidden",
          isDark(tempBackgroundColor) ? "border-[white]" : "border-[black]"
        )}
        style={{
          width: 128 + 24,
          height: 128 + 24,
          left: backgroundTooltipPosition.x - 64 - 12,
          top:
            backgroundTooltipPosition.y -
            64 -
            12 +
            (backgroundTooltipPosition.y < 160 ? 96 : -96),
          backgroundColor: `rgb(${tempBackgroundColor.r}, ${tempBackgroundColor.g}, ${tempBackgroundColor.b})`,
        }}
      >
        <canvas
          ref={backgroundTooltipCanvasRef}
          width={256}
          height={256}
          className={classNames(
            "scale-50 origin-top-left rounded-full overflow-hidden absolute top-3 left-3 border-2",
            isDark(tempBackgroundColor) ? "border-[white]" : "border-[black]"
          )}
          style={{
            width: 256,
            height: 256,
          }}
        />
        <div className="w-px bg-slate-900 h-32 absolute left-[76px] top-3" />
        <div className="h-px bg-slate-900 w-32 absolute top-[76px] left-3" />
      </div>

      {backgroundSelectionStage === 1 && (
        <div className="pointer-events-none px-8 w-full absolute z-10 bottom-12 left-0 ">
          <p className="px-4 bg-slate-700 text-white py-2 rounded-lg">
            画面をタッチして背景の色を選んでください。
          </p>
        </div>
      )}

      <div
        className={classNames(
          "absolute w-full flex justify-end bottom-4 px-4 z-10 space-x-2",
          isSelectingBackground && "hidden"
        )}
      >
        <a
          href="https://github.com/topia-myon/icon-ring"
          rel="noopener noreferrer"
          target="_blank"
        >
          <img
            alt="GitHub repository"
            src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
            className="w-12 h-12 rounded-full shadow-lg"
          />
        </a>
      </div>
    </div>
  );
}

export default App;
