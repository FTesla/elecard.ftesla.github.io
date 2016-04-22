using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace container_TS
{
    public class PacketTS
    {
        public int FlagError;
        public int FlagBeginData;
        public int FlagPriority;

        public int PID;

        public int Scramble;
        public int PointerData;
        public int ch;

        public byte[] data = new byte[184];
    }
}
