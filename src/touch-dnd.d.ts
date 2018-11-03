interface JQueryTouchDndDraggableOptions {
  connectWith?: string;
}

interface JQueryTouchDndDroppableOptions {
  accept?: string;
  activeClass?: string;
  hoverClass?: string;
}

interface JQuery {
  draggable(options?: JQueryTouchDndDraggableOptions): JQuery;
  droppable(options?: JQueryTouchDndDroppableOptions): JQuery;
}
