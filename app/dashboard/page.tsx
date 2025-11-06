'use client'

import React, { useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { Sidebar } from '@/components/Sidebar'
import { ComparisonView } from '@/components/ComparisonView'
import { requirementsData, flattenRequirements } from '@/lib/fake-data'

export default function Dashboard() {
  const [selectedRequirementId, setSelectedRequirementId] = useState('REQ-001')
  const [activeTab, setActiveTab] = useState<'config' | 'comparison' | 'responses'>('comparison')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const allRequirements = flattenRequirements(requirementsData)

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="flex flex-col h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
        {/* Navbar */}
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          theme={theme}
          onThemeChange={setTheme}
        />

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 flex-shrink-0 overflow-hidden">
            <Sidebar
              selectedRequirementId={selectedRequirementId}
              onSelectRequirement={setSelectedRequirementId}
            />
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'comparison' && (
              <ComparisonView
                selectedRequirementId={selectedRequirementId}
                allRequirements={allRequirements}
                onRequirementChange={setSelectedRequirementId}
              />
            )}

            {activeTab === 'config' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Configuration</h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Tab de configuration - À implémenter
                </p>
              </div>
            )}

            {activeTab === 'responses' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Réponses</h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Tab des réponses - À implémenter
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
