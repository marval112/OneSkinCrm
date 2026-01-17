import { TouchEvent, useState } from 'react';

interface SwipeInput {
    onSwipedLeft?: () => void;
    onSwipedRight?: () => void;
    onSwipedUp?: () => void;
    onSwipedDown?: () => void;
}

interface SwipeOutput {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
}

export default (input: SwipeInput): SwipeOutput => {
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;

    const onTouchStart = (e: TouchEvent) => {
        setTouchEnd(null); // Reset touch end
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchMove = (e: TouchEvent) => {
        setTouchEnd({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;
        const isLeftSwipe = distanceX > minSwipeDistance;
        const isRightSwipe = distanceX < -minSwipeDistance;
        const isUpSwipe = distanceY > minSwipeDistance;
        const isDownSwipe = distanceY < -minSwipeDistance;

        // We want to ensure it's mostly horizontal for left/right swipes
        // and mostly vertical for up/down swipes to avoid accidental triggers during scrolling
        const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);

        if (isHorizontal) {
            if (isLeftSwipe && input.onSwipedLeft) {
                input.onSwipedLeft();
            }
            if (isRightSwipe && input.onSwipedRight) {
                input.onSwipedRight();
            }
        } else {
            if (isUpSwipe && input.onSwipedUp) {
                input.onSwipedUp();
            }
            if (isDownSwipe && input.onSwipedDown) {
                input.onSwipedDown();
            }
        }
    };

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd
    };
};
