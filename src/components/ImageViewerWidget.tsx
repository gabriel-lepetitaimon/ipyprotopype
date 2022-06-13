import React, { useEffect, useRef } from 'react';
import { WidgetModelContext } from '../models/model';
import { WidgetModel } from '@jupyter-widgets/base';
import { createGlobalStateHook } from '../utils/global-states';
import { useModelState } from '../models/image-viewer-model';
import useZoomPan, { Transform } from '../utils/zoom-pan-context';
import { ORIGIN, Point } from '../utils/point';
import useEventListener from '../utils/event-listener';
import {
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Switch,
  Typography,
} from '@mui/material';
import ControlCameraIcon from '@mui/icons-material/ControlCamera';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import LinkIcon from '@mui/icons-material/Link';
import SettingsIcon from '@mui/icons-material/Settings';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import { ThemeProvider } from '@mui/material/styles';

import RulerAxis from './RulerAxis';

import { useTheme } from '../utils/mui';
import '../../css/ImageViewerWidger.css';

interface WidgetProps {
  model: WidgetModel;
}

interface VisibleArea {
  topLeft: Point;
  bottomRight: Point;
}

const useSharedVisibleArea = createGlobalStateHook<VisibleArea>({
  topLeft: ORIGIN,
  bottomRight: new Point(1, 1),
});

function ImageViewerWidget(props: WidgetProps) {
  // --- STATES ---
  const ref = useRef<HTMLDivElement | null>(null);
  const [img] = useModelState('_data');
  const [width] = useModelState('_width');
  const [height] = useModelState('_height');

  const [modelCenter, setModelCenter] = useModelState('center');
  const [modelScale, setScaleCenter] = useModelState('scale');

  // sharedCenter -> modelCenter -> center

  const [linkedTransform, setLinkedTransform] =
    useModelState('linkedTransform');
  let sharedTransform = null;
  if (linkedTransform) {
    sharedTransform = useSharedVisibleArea();
  }

  const [
    transform,
    startPan,
    zoom,
    setSceneSize,
    updateTransform,
    cursorPos,
    zoomMouseMove,
    zoomMouseOut,
  ] = useZoomPan(ref, new Point(width, height), 25);

  useEffect(() => {
    setSceneSize(new Point(width, height));
  }, [width, height]);

  // --- EVENTS ---
  useEventListener(ref, 'wheel', (e) => {
    if (ref.current === null) {
      return;
    }
    e.preventDefault();
    const bounds = ref.current.getBoundingClientRect();
    zoom(
      -e.deltaY / 30,
      new Point(e.clientX - bounds.left, e.clientY - bounds.top)
    );
  });

  const panHorizontally = (delta: number): void => {
    updateTransform((t) => {
      t.center.x += delta;
      return t;
    });
  };

  const panVertically = (delta: number): void => {
    updateTransform((t) => {
      t.center.y += delta;
      return t;
    });
  };

  // --- STYLE ---
  const rulerProps = {
    thickness: 15,
    scale: transform.scale,
  };

  const widgetStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `${rulerProps.thickness}px auto`,
    gridTemplateRows: `${rulerProps.thickness}px auto`,
  };

  const sceneStyle: React.CSSProperties = {
    width: `${width * transform.scale}px`,
    height: `${height * transform.scale}px`,
    position: 'absolute',
    left: `calc(50% ${transform.center.x < 0 ? '+' : '-'} ${
      Math.abs(transform.center.x) * transform.scale
    }px)`,
    top: `calc(50% ${transform.center.y < 0 ? '+' : '-'} ${
      Math.abs(transform.center.y) * transform.scale
    }px)`,
  };

  const imgStyle: React.CSSProperties = {
    // transform: `scale(${transform.scale})`,
    // transformOrigin: '0 0',
    width: '100%',
    height: '100%',
    imageRendering: transform.scale < 12 ? 'auto' : 'pixelated',
  };

  // --- RENDER ---
  return (
    <div className="ImageViewerWidget" style={widgetStyle}>
      <></>
      <Settings thickeness={rulerProps.thickness} />
      <RulerAxis
        orientation={'horizontal'}
        center={transform.center.x}
        cursorPos={cursorPos?.x}
        onPanCenter={panHorizontally}
        domain={width}
        style={{ gridRow: 1, gridColumn: 2 }}
        {...rulerProps}
      />
      <RulerAxis
        orientation={'vertical'}
        center={transform.center.y}
        cursorPos={cursorPos?.y}
        onPanCenter={panVertically}
        domain={height}
        style={{ gridRow: 2, gridColumn: 1 }}
        {...rulerProps}
      />

      <div
        ref={ref}
        onMouseDownCapture={startPan}
        onMouseMove={zoomMouseMove}
        onMouseOut={zoomMouseOut}
        style={{ gridRow: 2, gridColumn: 2, cursor: 'crosshair' }}
      >
        <div className={'ImageViewport'}>
          <div style={sceneStyle}>
            <img src={img} style={imgStyle} className="undraggable" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface SettingsProps {
  thickeness: number;
}

function Settings(props: SettingsProps) {
  const settingsIconStyle: React.CSSProperties = {
    height: props.thickeness - 2,
    color: 'var(--jp-inverse-layout-color3)',
  };

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton
        size="small"
        style={{ gridRow: 1, gridColumn: 1 }}
        onClick={handleClick}
      >
        <SettingsIcon style={settingsIconStyle} />
      </IconButton>
      <Menu
        sx={{ width: 250 }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        MenuListProps={{ dense: true }}
      >
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <ControlCameraIcon />
          </ListItemIcon>
          <ListItemText primary="Go To" />
          <Typography variant="body2" color="text.secondary">
            G
          </Typography>
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <LinkIcon />
          </ListItemIcon>
          <ListItemText primary="Link View" />
          <Switch
            edge="end"
            // onChange={handleToggle('wifi')}
            // checked={checked.indexOf('wifi') !== -1}
          />
          <Typography variant="body2" color="text.secondary">
            L
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <FullscreenIcon />
          </ListItemIcon>
          <ListItemText primary="Fullscreen" />
          <Typography variant="body2" color="text.secondary">
            F
          </Typography>
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <VerticalSplitIcon />
          </ListItemIcon>
          <ListItemText primary="Detach" />
          <Typography variant="body2" color="text.secondary">
            D
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
}

function withModelContext(Component: (props: WidgetProps) => JSX.Element) {
  return (props: WidgetProps) => (
    <WidgetModelContext.Provider value={props.model}>
      <ThemeProvider theme={useTheme()}>
        <Component {...props} />
      </ThemeProvider>
    </WidgetModelContext.Provider>
  );
}

export default withModelContext(ImageViewerWidget);
