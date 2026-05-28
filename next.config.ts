import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.dstech.it",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "i0.wp.com",
      },
      {
        protocol: "https",
        hostname: "cdt.europa.eu",
      },
      {
        protocol: "https",
        hostname: "commission.europa.eu",
      },
      {
        protocol: "https",
        hostname: "cpvo.europa.eu",
      },
      {
        protocol: "https",
        hostname: "eismea.ec.europa.eu",
      },
      {
        protocol: "https",
        hostname: "epso.europa.eu",
      },
      {
        protocol: "https",
        hostname: "euratom-supply.ec.europa.eu",
      },
      {
        protocol: "https",
        hostname: "eurohpc-ju.europa.eu",
      },
      {
        protocol: "https",
        hostname: "hadea.ec.europa.eu",
      },
      {
        protocol: "https",
        hostname: "smart-networks-services-ju.eu",
      },
      {
        protocol: "https",
        hostname: "www.amla.europa.eu",
      },
      {
        protocol: "https",
        hostname: "www.berec.europa.eu",
      },
      {
        protocol: "https",
        hostname: "www.cbe.europa.eu",
      },
      {
        protocol: "https",
        hostname: "www.cedefop.europa.eu",
      },
      {
        protocol: "https",
        hostname: "www.cepol.europa.eu",
      },
      {
        protocol: "https",
        hostname: "www.chips-ju.europa.eu",
      },
      {
        protocol: "https",
        hostname: "www.clean-hydrogen.europa.eu",
      },
      {
        protocol: "https",
        hostname: "www.cleanaviation.eu",
      },
      {
        protocol: "https",
        hostname: "www.eca.europa.eu",
      },
      {
        protocol: "https",
        hostname: "www.eccc.eu.int",
      },
      {
        protocol: "https",
        hostname: "www.edctp.org",
      },
      {
        protocol: "https",
        hostname: "www.eeas.europa.eu",
      },
      {
        protocol: "https",
        hostname: "www.eif.org",
      },
      {
        protocol: "https",
        hostname: "www.euda.europa.eu",
      },
      {
        protocol: "https",
        hostname: "www.eui.eu",
      },
      {
        protocol: "https",
        hostname: "www.eursc.eu",
      },
      {
        protocol: "https",
        hostname: "www.ihi.europa.eu",
      },
    ],
  },
};

export default nextConfig;
