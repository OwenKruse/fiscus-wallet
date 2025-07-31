import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
  } from "@/components/ui/sidebar"
  import {
    BarChart3,
    CreditCard,
    Home,
    PieChart,
    Receipt,
    Settings,
    Target,
    Wallet,
    User,
    ChevronUp,
  } from "lucide-react"
  import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
  import { usePathname } from "next/navigation"
  import Link from "next/link"
  
export function AppSidebar() {
    const pathname = usePathname()
    
    const menuItems = [
      {
        title: "Overview",
        icon: Home,
        url: "/",
      },
      {
        title: "Analytics",
        icon: BarChart3,
        url: "/analytics",
      },
      {
        title: "Transactions",
        icon: Receipt,
        url: "/transactions",
      },
      {
        title: "Cards",
        icon: CreditCard,
        url: "#",
      },
      {
        title: "Wallet",
        icon: Wallet,
        url: "#",
      },
      {
        title: "Goals",
        icon: Target,
        url: "#",
      },
      {
        title: "Reports",
        icon: PieChart,
        url: "#",
      },
    ]
  
    return (
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
                <a href="#" className="flex items-center gap-2 px-2">
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Wallet</span>
                    <span className="truncate text-xs">From Fiscus Financial</span>
                  </div>
                </a>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
  
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  const isActive = pathname === item.url
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        {item.url === "#" ? (
                          <a href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </a>
                        ) : (
                          <Link href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
  
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="#">
                      <Settings />
                      <span>Preferences</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
  
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <User className="size-4" />
                    <span>John Doe</span>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                  <DropdownMenuItem>
                    <span>Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    )
  }
  