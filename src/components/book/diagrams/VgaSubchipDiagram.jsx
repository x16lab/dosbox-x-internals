// components/VgaSubchipDiagram.jsx

export default function VgaSubchipDiagram() {
    return (
        <div className="vga-diagram">
            <svg
                viewBox="0 0 1000 760"
                role="img"
                aria-label="VGA architecture showing CPU access to five VGA subchips and shared video RAM"
            >

                {/* CPU */}
                <rect x="400" y="30" width="200" height="70" rx="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                <text x="500" y="65" textAnchor="middle" fontSize="20">
                    CPU
                </text>
                <text x="500" y="88" textAnchor="middle" fontSize="13">
                    I/O ports
                </text>


                {/* Sequencer */}
                <rect x="40" y="180" width="180" height="150" rx="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                <text x="130" y="210" textAnchor="middle" fontSize="18">
                    Sequencer
                </text>
                <text x="130" y="235" textAnchor="middle" fontSize="13">
                    3C4h / 3C5h
                </text>
                <text x="130" y="260" textAnchor="middle" fontSize="12">
                    5 registers
                </text>
                <text x="130" y="285" textAnchor="middle" fontSize="12">
                    memory clock
                </text>
                <text x="130" y="305" textAnchor="middle" fontSize="12">
                    plane write mask
                </text>


                {/* Graphics Controller */}
                <rect x="270" y="180" width="200" height="150" rx="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                <text x="370" y="210" textAnchor="middle" fontSize="18">
                    Graphics Controller
                </text>
                <text x="370" y="235" textAnchor="middle" fontSize="13">
                    3CEh / 3CFh
                </text>
                <text x="370" y="260" textAnchor="middle" fontSize="12">
                    9 registers
                </text>
                <text x="370" y="285" textAnchor="middle" fontSize="12">
                    CPU ↔ VRAM logic
                </text>
                <text x="370" y="305" textAnchor="middle" fontSize="12">
                    set/reset + masks
                </text>


                {/* CRTC */}
                <rect x="520" y="180" width="200" height="150" rx="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                <text x="620" y="210" textAnchor="middle" fontSize="18">
                    CRTC
                </text>
                <text x="620" y="235" textAnchor="middle" fontSize="13">
                    3B4h/3D4h + data
                </text>
                <text x="620" y="260" textAnchor="middle" fontSize="12">
                    25 registers
                </text>
                <text x="620" y="285" textAnchor="middle" fontSize="12">
                    scan address
                </text>
                <text x="620" y="305" textAnchor="middle" fontSize="12">
                    HSYNC / VSYNC
                </text>


                {/* Attribute Controller */}
                <rect x="770" y="180" width="190" height="150" rx="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                <text x="865" y="210" textAnchor="middle" fontSize="17">
                    Attribute Ctrl
                </text>
                <text x="865" y="235" textAnchor="middle" fontSize="13">
                    3C0h toggle port
                </text>
                <text x="865" y="260" textAnchor="middle" fontSize="12">
                    21 registers
                </text>
                <text x="865" y="285" textAnchor="middle" fontSize="12">
                    pixel → palette
                </text>
                <text x="865" y="305" textAnchor="middle" fontSize="12">
                    index selection
                </text>


                {/* VRAM */}
                <rect x="280" y="450" width="440" height="100" rx="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                <text x="500" y="490" textAnchor="middle" fontSize="20">
                    Shared VGA VRAM
                </text>
                <text x="500" y="520" textAnchor="middle" fontSize="13">
                    Plane 0 | Plane 1 | Plane 2 | Plane 3
                </text>


                {/* DAC */}
                <rect x="400" y="650" width="200" height="80" rx="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                <text x="500" y="680" textAnchor="middle" fontSize="18">
                    DAC
                </text>
                <text x="500" y="705" textAnchor="middle" fontSize="13">
                    3C7h / 3C8h / 3C9h
                </text>
                <text x="500" y="722" textAnchor="middle" fontSize="12">
                    256 × 18-bit RGB RAM
                </text>


                {/* CPU connections */}
                {[130,370,620,865].map((x)=>(
                    <line
                        key={x}
                        x1="500"
                        y1="100"
                        x2={x}
                        y2="180"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                ))}


                {/* logic blocks to VRAM */}
                {[130,370,620,865].map((x)=>(
                    <line
                        key={"vram"+x}
                        x1={x}
                        y1="330"
                        x2="500"
                        y2="450"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                ))}


                {/* VRAM to DAC */}
                <line
                    x1="500"
                    y1="550"
                    x2="500"
                    y2="650"
                    stroke="currentColor"
                    strokeWidth="2"
                />

                <text x="735" y="600" fontSize="12">
                    pixel index
                </text>

            </svg>

            <p>
                The DAC is downstream from the VGA pipeline. It never accesses VRAM
                directly; it receives a palette index produced by the Attribute
                Controller and converts it into analogue RGB output.
            </p>
        </div>
    );
}
