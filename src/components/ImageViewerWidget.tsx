import React, { useRef } from 'react';
import { useModelEvent, WidgetModelContext } from '../models/model';
import { WidgetModel } from '@jupyter-widgets/base';
import { useModelState } from '../models/image-viewer-model';
import {
  useSceneMouseEventListener,
  useZoomTransform,
} from '../utils/zoom-pan-handler';
import { Point } from '../utils/point';
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

function ImageViewerWidget(props: WidgetProps) {
  // --- STATES ---
  const ref = useRef<HTMLDivElement | null>(null);
  const [img] = useModelState('_data');
  const [imgSize] = useModelState('_size');

  const zoomTransform = useZoomTransform(ref, imgSize, 25);
  const cursorPos = useSceneMouseEventListener(zoomTransform);

  useModelEvent('change:_transform', (model) => {
    zoomTransform.dispatch({
      transform: model.get('_transform'),
      animation: { duration: 500 },
    });
  });

  const panHorizontally = (delta: number): void => {
    zoomTransform.dispatch({
      pan: new Point(delta, 0),
    });
  };

  const panVertically = (delta: number): void => {
    zoomTransform.dispatch({
      pan: new Point(0, delta),
    });
  };

  // --- STYLE ---
  const rulerProps = {
    thickness: 15,
    scale: zoomTransform.scale,
  };

  const widgetStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `${rulerProps.thickness}px auto`,
    gridTemplateRows: `${rulerProps.thickness}px auto`,
  };

  const sceneStyle: React.CSSProperties = {
    width: `${imgSize.x * zoomTransform.scale}px`,
    height: `${imgSize.y * zoomTransform.scale}px`,
    position: 'absolute',
    left: `calc(50% ${zoomTransform.center.x < 0 ? '+' : '-'} ${
      Math.abs(zoomTransform.center.x) * zoomTransform.scale
    }px)`,
    top: `calc(50% ${zoomTransform.center.y < 0 ? '+' : '-'} ${
      Math.abs(zoomTransform.center.y) * zoomTransform.scale
    }px)`,
  };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    imageRendering: zoomTransform.scale < 12 ? 'auto' : 'pixelated',
  };

  // --- RENDER ---
  return (
    <div className="ImageViewerWidget" style={widgetStyle}>
      <Settings thickness={rulerProps.thickness} />
      <RulerAxis
        orientation={'horizontal'}
        center={zoomTransform.center.x}
        cursorPos={cursorPos?.x}
        onPanCenter={panHorizontally}
        domain={imgSize.x}
        style={{ gridRow: 1, gridColumn: 2 }}
        {...rulerProps}
      />
      <RulerAxis
        orientation={'vertical'}
        center={zoomTransform.center.y}
        cursorPos={cursorPos?.y}
        onPanCenter={panVertically}
        domain={imgSize.y}
        style={{ gridRow: 2, gridColumn: 1 }}
        {...rulerProps}
      />

      <div ref={ref} style={{ gridRow: 2, gridColumn: 2, cursor: 'crosshair' }}>
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
  thickness: number;
}

function Settings(props: SettingsProps) {
  const settingsIconStyle: React.CSSProperties = {
    height: props.thickness - 2,
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
