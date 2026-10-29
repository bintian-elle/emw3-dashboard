"use client";

import type {AssetScope} from "@/lib/google-associated-assets";
import {NovaAssociatedAssets} from "./nova-associated-assets";

export function AssociatedAssets({scopes}:{scopes:AssetScope[]}){
 return <NovaAssociatedAssets scopes={scopes}/>;
}
