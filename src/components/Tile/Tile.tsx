import { CSSProperties } from 'react';
import './Tile.scss';

type FaceKind = 'mosaic' | 'full';

type FacePaint = {
    src: string;
    kind: FaceKind;
};

type Spin = 'x' | 'next' | 'prev';

type TileProps = {
    size: number;
    index: number;
    front: FacePaint;
    back: FacePaint;
    spin: Spin;
    spinY: number,
    flipped: boolean,
    snap: boolean,
    onSelect?: (index: number, e: React.MouseEvent) => void;
};

function Tile({size, index, front, back, spin, spinY, flipped, snap, onSelect }: TileProps){

    return (
        <div
            className="tile"
            id={`tile-${index}`}
            style={{ '--col': index % size, '--row': Math.floor(index / size), '--spin-y': spinY, } as CSSProperties}
            onClick={(e) => onSelect?.(index, e)}
        >
            <div className="tile__look">
                <div className={`tile__card${flipped ? ' is-flipped' : ''}${snap ? ' is-snap' : ''} is-spin-${spin}`}>
                    <div className={`tile__face tile__face--front tile__face--${front.kind}`}>
                        <img className="tile__image" src={front.src} alt="" />
                    </div>
                    <div className={`tile__face tile__face--back tile__face--${back.kind}`}>
                        <img className="tile__image" src={back.src} alt="" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Tile