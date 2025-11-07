"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { ImportJSON } from "@/components/ImportJSON"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, CheckCircle2 } from "lucide-react"

const CATEGORIES_EXAMPLE = JSON.stringify(
  {
    categories: [
      {
        id: "CAT-01",
        code: "REQ-SOL",
        title: "Required solution capabilities",
        short_name: "Required solution capabilities",
        level: 1,
        parent_id: null,
      },
      {
        id: "CAT-02",
        code: "SCOPE-COV",
        title: "Scope and Service Coverage",
        short_name: "Scope and Service",
        level: 1,
        parent_id: null,
      },
    ],
  },
  null,
  2
)

const REQUIREMENTS_EXAMPLE = JSON.stringify(
  {
    requirements: [
      {
        code: "REQ-001",
        title: "Commitment to Full Scope Coverage",
        weight: 1,
        category_name: "Scope and Service Coverage",
      },
    ],
  },
  null,
  2
)

interface ImportPageProps {
  params: {
    rfpId: string
  }
}

export default function ImportPage({ params }: ImportPageProps) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [categoriesImported, setCategoriesImported] = useState(false)
  const [activeTab, setActiveTab] = useState("categories")

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-slate-400 hover:text-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-50">Import RFP Data</h1>
            <p className="text-slate-400 mt-1">Import categories and requirements from JSON</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                categoriesImported
                  ? "bg-green-600"
                  : activeTab === "categories"
                    ? "bg-blue-600"
                    : "bg-slate-700"
              }`}
            >
              {categoriesImported ? <CheckCircle2 className="h-5 w-5" /> : <span>1</span>}
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {categoriesImported ? "✓ Categories imported" : "Import Categories"}
              </p>
              <p className="text-sm text-slate-400">Define the hierarchical structure</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                activeTab === "requirements" && categoriesImported
                  ? "bg-blue-600"
                  : categoriesImported
                    ? "bg-slate-600"
                    : "bg-slate-700"
              }`}
            >
              <span>2</span>
            </div>
            <div className="flex-1">
              <p className={`font-medium ${!categoriesImported ? "text-slate-500" : ""}`}>
                Import Requirements
              </p>
              <p className={`text-sm ${!categoriesImported ? "text-slate-600" : "text-slate-400"}`}>
                Link requirements to categories
              </p>
            </div>
          </div>
        </div>

        {/* Import Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-blue-600"
            >
              Step 1: Categories
            </TabsTrigger>
            <TabsTrigger
              value="requirements"
              disabled={!categoriesImported}
              className="data-[state=active]:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Step 2: Requirements
            </TabsTrigger>
          </TabsList>

          {/* Categories Import */}
          <TabsContent value="categories" className="space-y-6">
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle>Import Instructions</CardTitle>
                <CardDescription className="text-slate-400">
                  Follow these steps to import your RFP categories
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-slate-200">Step 1: Prepare your JSON</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Create a JSON file with your categories following the structure shown in the example below.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-200">Step 2: Copy & Paste</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Copy your JSON data and paste it into the text area. It will automatically format itself.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-200">Step 3: Review & Import</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Verify the JSON is valid, then click Import to create your categories.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ImportJSON
              title="Import Categories"
              description="Paste your categories JSON with the hierarchical structure (max 4 levels)"
              endpoint={`/api/rfps/${params.rfpId}/categories/import`}
              example={CATEGORIES_EXAMPLE}
              onSuccess={() => {
                setCategoriesImported(true)
                setActiveTab("requirements")
              }}
            />
          </TabsContent>

          {/* Requirements Import */}
          <TabsContent value="requirements" className="space-y-6">
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle>Import Instructions</CardTitle>
                <CardDescription className="text-slate-400">
                  Follow these steps to import your requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-slate-200">Requirements Format</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Each requirement must reference an existing category by name (category_name field).
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-200">Optional Suppliers</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      You can optionally include suppliers in the same JSON file. They will be imported along with your requirements.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-200">Weight Field</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      The weight field should be a number between 0 and 1, representing the requirement's importance.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ImportJSON
              title="Import Requirements & Suppliers"
              description="Paste your requirements and suppliers JSON. Categories must exist before importing requirements."
              endpoint={`/api/rfps/${params.rfpId}/requirements/import`}
              example={REQUIREMENTS_EXAMPLE}
              onSuccess={() => {
                setTimeout(() => {
                  router.push(`/dashboard/rfp/${params.rfpId}/evaluate`)
                }, 2000)
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-base">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-400">
            <div>
              <p className="font-medium text-slate-300 mb-1">Category Structure (1-4 levels)</p>
              <p>
                Categories are organized hierarchically. Level 1 categories can have parent_id set to null, while levels 2-4 must reference a parent.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-300 mb-1">Category Names</p>
              <p>
                When importing requirements, use the exact "title" value of the category in the "category_name" field.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-300 mb-1">Validation</p>
              <p>
                The system validates your JSON before importing. If there are errors, they will be displayed with helpful messages.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
